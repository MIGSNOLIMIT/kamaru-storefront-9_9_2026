-- Short label staff can edit for each catalog color (for example "Matte black").
alter table colors add column if not exists description text not null default '';
