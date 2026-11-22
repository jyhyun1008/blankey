/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class UserIsStreamer1795153826922 {
	name = 'UserIsStreamer1795153826922';

	async up(queryRunner) {
		await queryRunner.query('ALTER TABLE "user" ADD "isStreamer" boolean NOT NULL DEFAULT false');
	}

	async down(queryRunner) {
		await queryRunner.query('ALTER TABLE "user" DROP COLUMN "isStreamer"');
	}
}
