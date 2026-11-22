/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class EmojiStreamerCreator1795162339706 {
	name = 'EmojiStreamerCreator1795162339706';

	async up(queryRunner) {
		await queryRunner.query('ALTER TABLE "emoji" ADD "streamerCreatorId" character varying(32)');
		await queryRunner.query('CREATE INDEX "IDX_EMOJI_STREAMER_CREATOR_ID" ON "emoji" ("streamerCreatorId")');
		await queryRunner.query('ALTER TABLE "emoji" ADD CONSTRAINT "FK_EMOJI_STREAMER_CREATOR_ID" FOREIGN KEY ("streamerCreatorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION');
	}

	async down(queryRunner) {
		await queryRunner.query('ALTER TABLE "emoji" DROP CONSTRAINT "FK_EMOJI_STREAMER_CREATOR_ID"');
		await queryRunner.query('DROP INDEX "IDX_EMOJI_STREAMER_CREATOR_ID"');
		await queryRunner.query('ALTER TABLE "emoji" DROP COLUMN "streamerCreatorId"');
	}
}
