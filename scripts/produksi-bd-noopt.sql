-- Jam BD (kolom X) dan No Opt (kolom W) dari sheet TS Opt.
-- Aman diulang. Setelah ini: pasang kode, lalu import ulang TS Opt.

alter table ts_opt add column if not exists no_opt numeric(12,2);
alter table ts_opt add column if not exists bd_jam numeric(12,2);

comment on column ts_opt.no_opt is 'TS Opt kolom W No Opt (jam)';
comment on column ts_opt.bd_jam is 'TS Opt kolom X Breakdown Unit (jam BD)';
