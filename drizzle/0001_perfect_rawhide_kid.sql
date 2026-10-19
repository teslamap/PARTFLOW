ALTER TABLE `requests` ADD `accepted_offer_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `offer_shop_request` ON `offers` (`request_id`,`shop_id`);