-- Sprint X.13 polish: update theme_color for kasuga + nikko
-- Previous colors were near-black on bg-stone-950, rendering invisible
-- kasuga #6B4423 (dark brown) -> #D9534F (vermilion, matches the shrine's cinnabar corridors)
-- nikko  #1C1410 (near-black)  -> #E8B547 (gold, matches Yomeimon gate decoration)
-- Applied directly to production 2026-05-04; this migration records the change for local/branch parity.

update public.shrines set theme_color = '#D9534F' where slug = 'kasuga';
update public.shrines set theme_color = '#E8B547' where slug = 'nikko';
