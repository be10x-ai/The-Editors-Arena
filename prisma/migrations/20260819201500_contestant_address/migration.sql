-- Collect a postal address at registration, and stop requiring a job role.
--
-- Both changes are additive/widening, so they are safe to run against a live
-- table with existing registrations: no row is rewritten and nothing is
-- dropped. Historical rows keep whatever jobRole they were given.

ALTER TABLE "contestants" ADD COLUMN "address" TEXT;

ALTER TABLE "contestants" ALTER COLUMN "jobRole" DROP NOT NULL;
