/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class BuyMeACoffee1795164083161 {
	name = 'BuyMeACoffee1795164083161';

	async up(queryRunner) {
		await queryRunner.query('ALTER TABLE "page" ADD "supportersOnly" boolean NOT NULL DEFAULT false');
		await queryRunner.query('CREATE TABLE "buy_me_a_coffee_connection" ("id" uuid PRIMARY KEY, "creatorId" varchar(32) NOT NULL, "secret" varchar(256) NOT NULL, "emailKey" char(64) NOT NULL, "verified" boolean NOT NULL DEFAULT false, CONSTRAINT "FK_buy_me_a_coffee_creator" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE)');
		await queryRunner.query('CREATE UNIQUE INDEX "IDX_buy_me_a_coffee_creator" ON "buy_me_a_coffee_connection" ("creatorId")');
		await queryRunner.query('CREATE TABLE "buy_me_a_coffee_entitlement" ("connectionId" uuid NOT NULL, "scope" varchar(32) NOT NULL, "paymentId" bigint NOT NULL, "emailHash" char(64), "revoked" boolean NOT NULL, "expiresAt" timestamp with time zone, "eventCreated" bigint, "eventId" bigint, PRIMARY KEY ("connectionId", "scope", "paymentId"), CONSTRAINT "FK_buy_me_a_coffee_entitlement_connection" FOREIGN KEY ("connectionId") REFERENCES "buy_me_a_coffee_connection"("id") ON DELETE CASCADE)');
		await queryRunner.query('CREATE INDEX "IDX_buy_me_a_coffee_entitlement_email" ON "buy_me_a_coffee_entitlement" ("connectionId", "emailHash") WHERE NOT "revoked"');
	}

	async down(queryRunner) {
		const rows = await queryRunner.query('SELECT 1 FROM "page" WHERE "supportersOnly" LIMIT 1');
		if (rows.length > 0) {
			throw new Error('Cannot remove supporter access controls while protected pages still exist.');
		}
		await queryRunner.query('ALTER TABLE "page" DROP COLUMN "supportersOnly"');
		await queryRunner.query('DROP TABLE "buy_me_a_coffee_entitlement"');
		await queryRunner.query('DROP TABLE "buy_me_a_coffee_connection"');
	}
}
