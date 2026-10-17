-- Tarif Rp per HM, per unit (bukan global). Aman diulang.
alter table ts_unit_config add column if not exists tarif_hm numeric(14,2);
comment on column ts_unit_config.tarif_hm is 'Tarif pendapatan Rp per HM untuk unit ini.';
