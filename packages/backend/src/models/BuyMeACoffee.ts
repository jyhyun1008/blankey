/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { MiUser } from './User.js';
import { id } from './util/id.js';

@Entity('buy_me_a_coffee_connection')
@Index('IDX_buy_me_a_coffee_creator', ['creatorId'], { unique: true })
export class MiBuyMeACoffeeConnection {
	@PrimaryColumn('uuid')
	public id: string;

	@Column(id())
	public creatorId: string;

	@ManyToOne(() => MiUser, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'creatorId', foreignKeyConstraintName: 'FK_buy_me_a_coffee_creator' })
	public creator: MiUser;

	@Column('varchar', { length: 256 })
	public secret: string;

	@Column('char', { length: 64 })
	public emailKey: string;

	@Column('boolean', { default: false })
	public verified: boolean;
}

@Entity('buy_me_a_coffee_entitlement')
@Index('IDX_buy_me_a_coffee_entitlement_email', ['connectionId', 'emailHash'], { where: 'NOT "revoked"' })
export class MiBuyMeACoffeeEntitlement {
	@PrimaryColumn('uuid')
	public connectionId: string;

	@ManyToOne(() => MiBuyMeACoffeeConnection, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'connectionId', foreignKeyConstraintName: 'FK_buy_me_a_coffee_entitlement_connection' })
	public connection: MiBuyMeACoffeeConnection;

	@PrimaryColumn('varchar', { length: 32 })
	public scope: string;

	@PrimaryColumn('bigint')
	public paymentId: string;

	@Column('char', { length: 64, nullable: true })
	public emailHash: string | null;

	@Column('boolean')
	public revoked: boolean;

	@Column('timestamp with time zone', { nullable: true })
	public expiresAt: Date | null;

	@Column('bigint', { nullable: true })
	public eventCreated: string | null;

	@Column('bigint', { nullable: true })
	public eventId: string | null;
}
