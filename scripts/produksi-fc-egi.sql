-- Target FC (L/HM) per EGI per site. Aman diulang.
create table if not exists ts_fc_target (
  site text not null,
  egi text not null,
  fc_target numeric(8,2),
  primary key (site, egi)
);
comment on table ts_fc_target is 'Batas FC liter per HM, per EGI, per site.';
