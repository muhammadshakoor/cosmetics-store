\set ON_ERROR_STOP on
begin;
insert into "User" (id,name,email,password,"isAdmin") values ('support-test-user','Support test','support-test@example.test','not-a-real-password',false);
insert into "Product" (id,name,image,brand,category,description,price,"countInStock","userId")
values ('support-test-product','Soap','/soap.jpg','Test','soaps','Test product',450,0,'support-test-user');
insert into "RestockSubscription" (id,email,"productId","unsubscribeToken") values
('alert-1','one@example.test','support-test-product',repeat('a',64)),
('alert-2','two@example.test','support-test-product',repeat('b',64)),
('alert-3','three@example.test','support-test-product',repeat('c',64));

do $$
declare claimed integer;
begin
  if not consume_rate_limit('support-integration-key',2,600) then raise exception 'First request rejected'; end if;
  if not consume_rate_limit('support-integration-key',2,600) then raise exception 'Second request rejected'; end if;
  if consume_rate_limit('support-integration-key',2,600) then raise exception 'Rate limit not enforced'; end if;
  update "RateLimitBucket" set "expiresAt" = now()-interval '1 second' where key='support-integration-key';
  if not consume_rate_limit('support-integration-key',2,600) then raise exception 'Expired bucket did not reset'; end if;

  select count(*) into claimed from claim_restock_alerts('support-test-product',2);
  if claimed <> 0 then raise exception 'Alert claimed for an unavailable product'; end if;
  update "Product" set "countInStock"=5 where id='support-test-product';
  select count(*) into claimed from claim_restock_alerts('support-test-product',2);
  if claimed <> 2 then raise exception 'Batch limit not respected'; end if;
  select count(*) into claimed from claim_restock_alerts('support-test-product',2);
  if claimed <> 1 then raise exception 'Already leased alert claimed twice'; end if;
  select count(*) into claimed from claim_restock_alerts('support-test-product',2);
  if claimed <> 0 then raise exception 'Concurrent batch can reclaim leased alerts'; end if;
  update "RestockSubscription" set "leaseUntil"=now()-interval '1 second' where id='alert-1';
  select count(*) into claimed from claim_restock_alerts('support-test-product',2);
  if claimed <> 1 then raise exception 'Expired lease cannot be retried'; end if;
  update "RestockSubscription" set active=false,"leaseUntil"=null;
  select count(*) into claimed from claim_restock_alerts('support-test-product',2);
  if claimed <> 0 then raise exception 'Unsubscribed alert claimed'; end if;

  if has_function_privilege('anon','public.consume_rate_limit(text,integer,integer)','EXECUTE') then raise exception 'Anonymous rate-limit mutation allowed'; end if;
  if has_function_privilege('authenticated','public.claim_restock_alerts(text,integer)','EXECUTE') then raise exception 'Customer can claim subscriber data'; end if;
  if has_table_privilege('anon','public."NewsletterSubscriber"','SELECT') or has_table_privilege('authenticated','public."Complaint"','SELECT') then raise exception 'Customer support data exposed'; end if;
end $$;
rollback;
