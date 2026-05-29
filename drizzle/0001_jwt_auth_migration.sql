-- Migration: Convert users table from Manus OAuth to JWT email/password auth
-- Applied: 2026-05-29

-- Drop old unique constraint on openId
ALTER TABLE `users` DROP INDEX `users_openId_unique`;

-- Add new columns for JWT auth
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255) NOT NULL DEFAULT '' AFTER `id`;
ALTER TABLE `users` ADD COLUMN `firstName` varchar(100) NULL AFTER `passwordHash`;
ALTER TABLE `users` ADD COLUMN `lastName` varchar(100) NULL AFTER `firstName`;
ALTER TABLE `users` ADD COLUMN `mobile` varchar(20) NULL AFTER `lastName`;
ALTER TABLE `users` ADD COLUMN `tier` enum('free','tier1','tier2','tier3') NOT NULL DEFAULT 'free' AFTER `role`;
ALTER TABLE `users` ADD COLUMN `stripeCustomerId` varchar(255) NULL AFTER `tier`;
ALTER TABLE `users` ADD COLUMN `stripeSubscriptionId` varchar(255) NULL AFTER `stripeCustomerId`;
ALTER TABLE `users` ADD COLUMN `brokerReferral` text NULL AFTER `stripeSubscriptionId`;
ALTER TABLE `users` ADD COLUMN `smsConsent` int NOT NULL DEFAULT 0 AFTER `brokerReferral`;

-- Make email NOT NULL and UNIQUE
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;
ALTER TABLE `users` ADD UNIQUE INDEX `users_email_unique` (`email`);

-- Drop old OAuth columns
ALTER TABLE `users` DROP COLUMN `openId`;
ALTER TABLE `users` DROP COLUMN `name`;
ALTER TABLE `users` DROP COLUMN `loginMethod`;
