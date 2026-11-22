/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class EmojiStreamer1795161731805 {
	name = 'EmojiStreamer1795161731805';

	async up(queryRunner) {
		await queryRunner.query('ALTER TABLE "emoji" ADD "streamerId" character varying(32)');
		await queryRunner.query('CREATE INDEX "IDX_EMOJI_STREAMER_ID" ON "emoji" ("streamerId")');
		await queryRunner.query('ALTER TABLE "emoji" ADD CONSTRAINT "FK_EMOJI_STREAMER_ID" FOREIGN KEY ("streamerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION');
	}

	async down(queryRunner) {
		await queryRunner.query('ALTER TABLE "emoji" DROP CONSTRAINT "FK_EMOJI_STREAMER_ID"');
		await queryRunner.query('DROP INDEX "IDX_EMOJI_STREAMER_ID"');
		await queryRunner.query('ALTER TABLE "emoji" DROP COLUMN "streamerId"');
	}
}
