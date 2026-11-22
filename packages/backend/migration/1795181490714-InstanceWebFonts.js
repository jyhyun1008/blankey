/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class InstanceWebFonts1795181490714 {
	name = 'InstanceWebFonts1795181490714';

	async up(queryRunner) {
		await queryRunner.query('ALTER TABLE "meta" ADD "webFontRegularUrl" character varying(2048), ADD "webFontBoldUrl" character varying(2048)');
	}

	async down(queryRunner) {
		await queryRunner.query('ALTER TABLE "meta" DROP COLUMN "webFontRegularUrl", DROP COLUMN "webFontBoldUrl"');
	}
}
