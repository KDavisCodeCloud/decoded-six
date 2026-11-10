-- Bonus shorts: one-off posts (e.g. a new Rockstar trailer) that sit next to
-- the day's countdown short. Bonus rows use day_number 101+ so their storage
-- path ({post_date}/dayNNN.mp4), work dir and approvals filename never collide
-- with the countdown row for the same date. A date may hold several shorts,
-- but never two with the same day_number.
ALTER TABLE ds_shorts DROP CONSTRAINT IF EXISTS ds_shorts_post_date_key;
ALTER TABLE ds_shorts DROP CONSTRAINT IF EXISTS ds_shorts_post_date_day_number_key;
ALTER TABLE ds_shorts ADD CONSTRAINT ds_shorts_post_date_day_number_key UNIQUE (post_date, day_number);
