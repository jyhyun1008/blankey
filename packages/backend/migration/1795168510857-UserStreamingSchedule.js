/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class UserStreamingSchedule1795168510857 {
	name = 'UserStreamingSchedule1795168510857';

	async up(queryRunner) {
		await queryRunner.query('ALTER TABLE "user_profile" ADD "streamingSchedule" jsonb NOT NULL DEFAULT \'[]\'');
	}

	async down(queryRunner) {
		await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN "streamingSchedule"');
	}
}
