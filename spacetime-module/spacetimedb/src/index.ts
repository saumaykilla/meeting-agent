import { schema, table, t, type ReducerCtx } from 'spacetimedb/server';

const spacetimedb = schema({
  company: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      name: t.string(),
      createdAt: t.u64(), // Timestamp
      adminUserId: t.u64(),
    }
  ),
  companySetting: table(
    { public: true },
    {
      companyId: t.u64().primaryKey(),
      agentAutoJoin: t.bool(),
      postSummaries: t.bool(),
      notifyRepeatedTopics: t.bool(),
      topicSensitivity: t.string(), // "Low" | "Medium" | "High"
      updatedAt: t.u64(),
    }
  ),
  user: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      identity: t.option(t.string()),
      companyId: t.u64(),
      email: t.string(),
      displayName: t.string(),
      role: t.string(), // "Admin" | "Employee"
      inviteToken: t.option(t.string()),
      mustResetPassword: t.bool(),
      isActive: t.bool(),
      createdAt: t.u64(),
    }
  ),
  authCredential: table(
    { public: false },
    {
      userId: t.u64().primaryKey(),
      email: t.string(),
      passwordHash: t.string(),
    }
  ),

  meeting: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      companyId: t.u64(),
      title: t.string(),
      description: t.option(t.string()),
      scheduledAt: t.u64(),
      startedAt: t.option(t.u64()),
      endedAt: t.option(t.u64()),
      livekitRoomName: t.string(),
      createdBy: t.u64(),
      status: t.string(), // "Scheduled" | "Active" | "Ended"
      agentEnabled: t.option(t.bool()),
    }
  ),
  meetingParticipant: table(
    { public: true },
    {
      meetingId: t.u64(),
      userId: t.u64(),
      joinedAt: t.option(t.u64()),
    }
  ),
  channel: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      companyId: t.u64(),
      name: t.string(), // without #
      createdBy: t.u64(),
      createdAt: t.u64(),
      isPrivate: t.bool(),
    }
  ),
  channelMember: table(
    { public: true },
    {
      channelId: t.u64(),
      userId: t.u64(),
      joinedAt: t.u64(),
    }
  ),
  dmConversation: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      companyId: t.u64(),
      userAId: t.u64(),    // always lower ID
      userBId: t.u64(),    // always higher ID
      createdAt: t.u64(),
    }
  ),
  message: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      companyId: t.u64(),
      senderId: t.u64(),        // 0 = CC Assistant
      content: t.string(),
      sentAt: t.u64(),
      channelType: t.string(), // "Channel" | "DirectMessage" | "MeetingThread"
      channelId: t.u64(),
      isAgentMessage: t.bool(),
    }
  ),
  meetingSummary: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      meetingId: t.u64(),
      companyId: t.u64(),
      summaryText: t.string(),
      keyDecisions: t.string(),   // JSON array
      actionItems: t.string(),    // JSON array
      generatedAt: t.u64(),
      pineconeIndexed: t.bool(),
    }
  ),
});

// Infer Schema type
type S = typeof spacetimedb.schemaType;

function now(ctx: ReducerCtx<S>): bigint {
  return ctx.timestamp.toMillis();
}

function currentUser(ctx: ReducerCtx<S>) {
  const identity = ctx.sender.toHexString();
  for (const user of ctx.db.user.iter()) {
    if (user.identity === identity) {
      return user;
    }
  }
  return undefined;
}

function requireActiveUser(ctx: ReducerCtx<S>) {
  const user = currentUser(ctx);
  if (!user || !user.isActive) {
    throw new Error("You must be signed in with an active account.");
  }
  if (user.mustResetPassword) {
    throw new Error("You must reset your password before continuing.");
  }
  return user;
}

function requireAdmin(ctx: ReducerCtx<S>) {
  const user = requireActiveUser(ctx);
  if (user.role !== "Admin") {
    throw new Error("Admin access required.");
  }
  return user;
}

function countActiveAdmins(ctx: ReducerCtx<S>, companyId: bigint): number {
  let count = 0;
  for (const user of ctx.db.user.iter()) {
    if (user.companyId === companyId && user.role === "Admin" && user.isActive && !user.mustResetPassword) {
      count += 1;
    }
  }
  return count;
}

function findCompanyUser(ctx: ReducerCtx<S>, companyId: bigint, userId: bigint) {
  const user = ctx.db.user.id.find(userId);
  if (!user || user.companyId !== companyId) {
    throw new Error("User not found in this company.");
  }
  return user;
}

function assertValidRole(role: string) {
  if (role !== "Admin" && role !== "Employee") {
    throw new Error("Invalid role.");
  }
}

function assertValidSensitivity(topicSensitivity: string) {
  if (topicSensitivity !== "Low" && topicSensitivity !== "Medium" && topicSensitivity !== "High") {
    throw new Error("Invalid topic sensitivity.");
  }
}

function assertEmailUnused(ctx: ReducerCtx<S>, email: string, exceptUserId?: bigint) {
  const normalizedEmail = email.trim().toLowerCase();
  for (const user of ctx.db.user.iter()) {
    if (
      user.email.toLowerCase() === normalizedEmail &&
      user.id !== exceptUserId
    ) {
      throw new Error(user.mustResetPassword ? "A first-login password is already pending for this email." : "An account already exists for this email.");
    }
  }
}

function findUserByEmail(ctx: ReducerCtx<S>, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  for (const credential of ctx.db.authCredential.iter()) {
    if (credential.email.toLowerCase() === normalizedEmail) {
      const user = ctx.db.user.id.find(credential.userId);
      if (user) {
        return { user, credential };
      }
    }
  }
  return undefined;
}

function assertPasswordHash(passwordHash: string) {
  const trimmedHash = passwordHash.trim();
  if (!trimmedHash) {
    throw new Error("Password is required.");
  }
  return trimmedHash;
}

function assertIdentityUnused(ctx: ReducerCtx<S>) {
  const identity = ctx.sender.toHexString();
  for (const user of ctx.db.user.iter()) {
    if (user.identity === identity && user.isActive) {
      throw new Error("This SpacetimeDB identity is already linked to an account.");
    }
  }
}

function assertMessageTarget(ctx: ReducerCtx<S>, userCompanyId: bigint, userId: bigint, channelType: string, channelId: bigint) {
  if (channelType === "Channel") {
    const channel = ctx.db.channel.id.find(channelId);
    if (!channel || channel.companyId !== userCompanyId) {
      throw new Error("Channel not found.");
    }
    if (channel.isPrivate) {
      let isMember = false;
      for (const member of ctx.db.channelMember.iter()) {
        if (member.channelId === channelId && member.userId === userId) {
          isMember = true;
          break;
        }
      }
      if (!isMember) {
        throw new Error("You are not a member of this private channel.");
      }
    }
    return;
  }

  if (channelType === "DirectMessage") {
    const dm = ctx.db.dmConversation.id.find(channelId);
    if (!dm || dm.companyId !== userCompanyId || (dm.userAId !== userId && dm.userBId !== userId)) {
      throw new Error("Direct message conversation not found.");
    }
    return;
  }

  if (channelType === "MeetingThread") {
    const meeting = ctx.db.meeting.id.find(channelId);
    if (!meeting || meeting.companyId !== userCompanyId) {
      throw new Error("Meeting thread not found.");
    }
    return;
  }

  throw new Error("Invalid channel type.");
}

function ensureGeneralChannelMember(ctx: ReducerCtx<S>, userId: bigint, companyId: bigint) {
  for (const member of ctx.db.channelMember.iter()) {
    if (member.userId === userId) {
      const channel = ctx.db.channel.id.find(member.channelId);
      if (channel && channel.companyId === companyId && channel.name === "general") {
        return;
      }
    }
  }

  for (const channel of ctx.db.channel.iter()) {
    if (channel.companyId === companyId && channel.name === "general") {
      ctx.db.channelMember.insert({
        channelId: channel.id,
        userId,
        joinedAt: now(ctx),
      });
      return;
    }
  }
}

function deleteUserRecord(ctx: ReducerCtx<S>, userId: bigint) {
  const credential = ctx.db.authCredential.userId.find(userId);
  if (credential) {
    ctx.db.authCredential.userId.delete(userId);
  }
  for (const member of ctx.db.channelMember.iter()) {
    if (member.userId === userId) {
      ctx.db.channelMember.delete(member);
    }
  }
  for (const participant of ctx.db.meetingParticipant.iter()) {
    if (participant.userId === userId) {
      ctx.db.meetingParticipant.delete(participant);
    }
  }
  for (const dm of ctx.db.dmConversation.iter()) {
    if (dm.userAId === userId || dm.userBId === userId) {
      ctx.db.dmConversation.delete(dm);
    }
  }
  ctx.db.user.id.delete(userId);
}

// --- REDUCERS ---

// Register company + admin user
export const registerCompany = spacetimedb.reducer(
  {
    companyName: t.string(),
    adminName: t.string(),
    email: t.string(),
    passwordHash: t.string(),
  },
  (ctx: ReducerCtx<S>, { companyName, adminName, email, passwordHash }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const initialPasswordHash = assertPasswordHash(passwordHash);
    assertEmailUnused(ctx, normalizedEmail);
    assertIdentityUnused(ctx);

    for (const company of ctx.db.company.iter()) {
      if (company.name.toLowerCase() === companyName.trim().toLowerCase()) {
        throw new Error("Company name is already taken.");
      }
    }

    // 1. Create company record (need a dummy adminUserId first, or insert user first)
    const company = ctx.db.company.insert({
      id: 0n,
      name: companyName.trim(),
      createdAt: now(ctx),
      adminUserId: 0n, // Placeholder
    });

    // 2. Create the admin user (link to caller's identity)
    const user = ctx.db.user.insert({
      id: 0n,
      identity: ctx.sender.toHexString(),
      companyId: company.id,
      email: normalizedEmail,
      displayName: adminName.trim(),
      role: "Admin",
      inviteToken: undefined,
      mustResetPassword: false,
      isActive: true,
      createdAt: now(ctx),
    });
    ctx.db.authCredential.insert({
      userId: user.id,
      email: normalizedEmail,
      passwordHash: initialPasswordHash,
    });

    // 3. Update company with actual admin user id
    ctx.db.company.id.update({
      ...company,
      adminUserId: user.id,
    });

    // 4. Create #general channel
    const channel = ctx.db.channel.insert({
      id: 0n,
      companyId: company.id,
      name: "general",
      createdBy: user.id,
      createdAt: now(ctx),
      isPrivate: false,
    });

    // 5. Add admin to #general
    ctx.db.channelMember.insert({
      channelId: channel.id,
      userId: user.id,
      joinedAt: now(ctx),
    });

    ctx.db.companySetting.insert({
      companyId: company.id,
      agentAutoJoin: true,
      postSummaries: true,
      notifyRepeatedTopics: true,
      topicSensitivity: "Medium",
      updatedAt: now(ctx),
    });
  }
);

// Logout is client-local with SpacetimeDB auth; never unlink accounts from identities here.
export const logout = spacetimedb.reducer(
  {},
  (_ctx: ReducerCtx<S>) => {}
);

export const login = spacetimedb.reducer(
  {
    email: t.string(),
    passwordHash: t.string(),
  },
  (ctx: ReducerCtx<S>, { email, passwordHash }) => {
    const result = findUserByEmail(ctx, email);
    if (!result || !result.user.isActive || result.credential.passwordHash !== assertPasswordHash(passwordHash)) {
      throw new Error("Invalid email or password.");
    }
    const { user } = result;

    const identity = ctx.sender.toHexString();
    for (const existingUser of ctx.db.user.iter()) {
      if (existingUser.identity === identity && existingUser.id !== user.id) {
        ctx.db.user.id.update({
          ...existingUser,
          identity: undefined,
        });
      }
    }

    ctx.db.user.id.update({
      ...user,
      identity,
    });
  }
);

// Create employee account with a generated first-login password.
export const createInvite = spacetimedb.reducer(
  {
    email: t.string(),
    role: t.string(),
    passwordHash: t.string(),
  },
  (ctx: ReducerCtx<S>, { email, role, passwordHash }) => {
    const admin = requireAdmin(ctx);
    assertValidRole(role);
    assertEmailUnused(ctx, email);
    const initialPasswordHash = assertPasswordHash(passwordHash);
    
    const user = ctx.db.user.insert({
      id: 0n,
      identity: undefined,
      companyId: admin.companyId,
      email: email.trim().toLowerCase(),
      displayName: "",
      role,
      inviteToken: undefined,
      mustResetPassword: true,
      isActive: true,
      createdAt: now(ctx),
    });
    ctx.db.authCredential.insert({
      userId: user.id,
      email: user.email,
      passwordHash: initialPasswordHash,
    });
  }
);

// Legacy no-op kept for older generated clients during development.
export const acceptInvite = spacetimedb.reducer(
  {
    token: t.string(),
    displayName: t.string(),
  },
  (_ctx: ReducerCtx<S>, _args) => {
    throw new Error("Invite tokens are no longer supported. Sign in with email and password.");
  }
);

// Create meeting
export const createMeeting = spacetimedb.reducer(
  {
    title: t.string(),
    description: t.option(t.string()),
    scheduledAt: t.u64(),
    participantIds: t.array(t.u64()),
    agentEnabled: t.bool(),
  },
  (ctx: ReducerCtx<S>, { title, description, scheduledAt, participantIds, agentEnabled }) => {
    const user = requireActiveUser(ctx);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error("Meeting title is required.");
    }
    
    // We insert a blank room name first, then update it with the ID.
    const meeting = ctx.db.meeting.insert({
      id: 0n,
      companyId: user.companyId,
      title: trimmedTitle,
      description: description?.trim() || undefined,
      scheduledAt,
      startedAt: undefined,
      endedAt: undefined,
      livekitRoomName: "",
      createdBy: user.id,
      status: "Scheduled",
      agentEnabled,
    });

    const roomName = `cc-${user.companyId}-${meeting.id}`;
    ctx.db.meeting.id.update({
      ...meeting,
      livekitRoomName: roomName,
    });

    const participantSet = new Set<bigint>([user.id, ...participantIds]);
    // Add participants
    for (const pId of participantSet) {
      findCompanyUser(ctx, user.companyId, pId);
      ctx.db.meetingParticipant.insert({
        meetingId: meeting.id,
        userId: pId,
        joinedAt: undefined,
      });
    }
  }
);

export const cancelMeeting = spacetimedb.reducer(
  {
    meetingId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { meetingId }) => {
    const user = requireActiveUser(ctx);
    const meeting = ctx.db.meeting.id.find(meetingId);
    if (!meeting || meeting.companyId !== user.companyId) {
      throw new Error("Meeting not found.");
    }
    if (meeting.status !== "Scheduled") {
      throw new Error("Only scheduled meetings can be cancelled.");
    }
    if (meeting.createdBy !== user.id && user.role !== "Admin") {
      throw new Error("Only the host or an admin can cancel this meeting.");
    }

    for (const participant of ctx.db.meetingParticipant.iter()) {
      if (participant.meetingId === meetingId) {
        ctx.db.meetingParticipant.delete(participant);
      }
    }
    ctx.db.meeting.id.delete(meetingId);
  }
);

// Start meeting
export const startMeeting = spacetimedb.reducer(
  {
    meetingId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { meetingId }) => {
    const user = requireActiveUser(ctx);
    const m = ctx.db.meeting.id.find(meetingId);
    if (m && m.companyId === user.companyId) {
      ctx.db.meeting.id.update({
        ...m,
        startedAt: now(ctx),
        status: "Active",
      });
    }
  }
);

// End meeting
export const endMeeting = spacetimedb.reducer(
  {
    meetingId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { meetingId }) => {
    const user = requireActiveUser(ctx);
    const m = ctx.db.meeting.id.find(meetingId);
    if (m && m.companyId === user.companyId) {
      ctx.db.meeting.id.update({
        ...m,
        endedAt: now(ctx),
        status: "Ended",
      });
    }
  }
);

// Send message
export const sendMessage = spacetimedb.reducer(
  {
    content: t.string(),
    channelType: t.string(),
    channelId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { content, channelType, channelId }) => {
    const user = requireActiveUser(ctx);
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error("Message cannot be empty.");
    }
    if (trimmedContent.length > 4000) {
      throw new Error("Message is too long.");
    }
    assertMessageTarget(ctx, user.companyId, user.id, channelType, channelId);

    ctx.db.message.insert({
      id: 0n,
      companyId: user.companyId,
      senderId: user.id,
      content: trimmedContent,
      sentAt: now(ctx),
      channelType,
      channelId,
      isAgentMessage: false,
    });
  }
);

// Post agent message
export const postAgentMessage = spacetimedb.reducer(
  {
    companyId: t.u64(),
    content: t.string(),
    channelType: t.string(),
    channelId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { companyId, content, channelType, channelId }) => {
    ctx.db.message.insert({
      id: 0n,
      companyId,
      senderId: 0n, // CC Assistant
      content,
      sentAt: now(ctx),
      channelType,
      channelId,
      isAgentMessage: true,
    });
  }
);

// Create channel
export const createChannel = spacetimedb.reducer(
  {
    name: t.string(),
    isPrivate: t.bool(),
  },
  (ctx: ReducerCtx<S>, { name, isPrivate }) => {
    const user = requireActiveUser(ctx);
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/^#+/, "");
    if (!normalizedName || normalizedName.length > 60) {
      throw new Error("Channel name must be 1-60 characters.");
    }
    for (const channel of ctx.db.channel.iter()) {
      if (channel.companyId === user.companyId && channel.name === normalizedName) {
        throw new Error("A channel with this name already exists.");
      }
    }

    const c = ctx.db.channel.insert({
      id: 0n,
      companyId: user.companyId,
      name: normalizedName,
      createdBy: user.id,
      createdAt: now(ctx),
      isPrivate,
    });

    ctx.db.channelMember.insert({
      channelId: c.id,
      userId: user.id,
      joinedAt: now(ctx),
    });
  }
);

// Join channel
export const joinChannel = spacetimedb.reducer(
  {
    channelId: t.u64(),
    userId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { channelId, userId }) => {
    const caller = requireActiveUser(ctx);
    if (caller.id !== userId) {
      throw new Error("You can only join channels as yourself.");
    }
    const channel = ctx.db.channel.id.find(channelId);
    if (!channel || channel.companyId !== caller.companyId) {
      throw new Error("Channel not found.");
    }
    for (const member of ctx.db.channelMember.iter()) {
      if (member.channelId === channelId && member.userId === userId) {
        return;
      }
    }
    ctx.db.channelMember.insert({
      channelId,
      userId,
      joinedAt: now(ctx),
    });
  }
);

// Open DM
export const openDm = spacetimedb.reducer(
  {
    otherUserId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { otherUserId }) => {
    const user = requireActiveUser(ctx);
    if (user.id === otherUserId) {
      throw new Error("Cannot open a DM with yourself.");
    }
    findCompanyUser(ctx, user.companyId, otherUserId);

    // Enforce userAId < userBId
    const aId = user.id < otherUserId ? user.id : otherUserId;
    const bId = user.id < otherUserId ? otherUserId : user.id;

    // Check if exists
    let exists = false;
    for (const dm of ctx.db.dmConversation.iter()) {
      if (dm.companyId === user.companyId && dm.userAId === aId && dm.userBId === bId) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      ctx.db.dmConversation.insert({
        id: 0n,
        companyId: user.companyId,
        userAId: aId,
        userBId: bId,
        createdAt: now(ctx),
      });
    }
  }
);

export const regenerateInviteToken = spacetimedb.reducer(
  {
    userId: t.u64(),
    passwordHash: t.string(),
  },
  (ctx: ReducerCtx<S>, { userId, passwordHash }) => {
    const admin = requireAdmin(ctx);
    const invitedUser = findCompanyUser(ctx, admin.companyId, userId);
    if (!invitedUser.mustResetPassword) {
      throw new Error("Only first-login passwords can be regenerated.");
    }
    const credential = ctx.db.authCredential.userId.find(invitedUser.id);
    if (!credential) {
      throw new Error("Credentials not found.");
    }
    ctx.db.authCredential.userId.update({
      ...credential,
      passwordHash: assertPasswordHash(passwordHash),
    });
    ctx.db.user.id.update({
      ...invitedUser,
      identity: undefined,
    });
  }
);

export const revokeInvite = spacetimedb.reducer(
  {
    userId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { userId }) => {
    const admin = requireAdmin(ctx);
    const invitedUser = findCompanyUser(ctx, admin.companyId, userId);
    if (!invitedUser.mustResetPassword) {
      throw new Error("Only first-login accounts can be revoked.");
    }
    deleteUserRecord(ctx, invitedUser.id);
  }
);

export const updateUserRole = spacetimedb.reducer(
  {
    userId: t.u64(),
    newRole: t.string(),
  },
  (ctx: ReducerCtx<S>, { userId, newRole }) => {
    const admin = requireAdmin(ctx);
    assertValidRole(newRole);
    const targetUser = findCompanyUser(ctx, admin.companyId, userId);
    if (targetUser.role === "Admin" && newRole !== "Admin" && countActiveAdmins(ctx, admin.companyId) <= 1) {
      throw new Error("At least one active admin is required.");
    }
    ctx.db.user.id.update({
      ...targetUser,
      role: newRole,
    });
  }
);

export const updateUserProfile = spacetimedb.reducer(
  {
    displayName: t.string(),
  },
  (ctx: ReducerCtx<S>, { displayName }) => {
    const user = requireActiveUser(ctx);
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      throw new Error("Display name must be 2-80 characters.");
    }

    ctx.db.user.id.update({
      ...user,
      displayName: trimmedName,
    });
  }
);

export const updatePassword = spacetimedb.reducer(
  {
    oldPasswordHash: t.string(),
    newPasswordHash: t.string(),
    displayName: t.option(t.string()),
  },
  (ctx: ReducerCtx<S>, { oldPasswordHash, newPasswordHash, displayName }) => {
    const user = currentUser(ctx);
    if (!user || !user.isActive) {
      throw new Error("You must be signed in with an active account.");
    }
    const credential = ctx.db.authCredential.userId.find(user.id);
    if (!credential) {
      throw new Error("Credentials not found.");
    }
    const nextHash = newPasswordHash.trim();
    if (!nextHash) {
      throw new Error("New password hash is required.");
    }
    if (credential.passwordHash !== assertPasswordHash(oldPasswordHash)) {
      throw new Error("Current password is incorrect.");
    }
    if (nextHash === credential.passwordHash) {
      throw new Error("New password must be different.");
    }

    const nextDisplayName = displayName?.trim() || user.displayName;
    if (!nextDisplayName || nextDisplayName.length < 2 || nextDisplayName.length > 80) {
      throw new Error("Display name must be 2-80 characters.");
    }

    ctx.db.authCredential.userId.update({
      ...credential,
      passwordHash: nextHash,
    });
    ctx.db.user.id.update({
      ...user,
      displayName: nextDisplayName,
      mustResetPassword: false,
    });
    ensureGeneralChannelMember(ctx, user.id, user.companyId);
  }
);

export const removeUser = spacetimedb.reducer(
  {
    userId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { userId }) => {
    const admin = requireAdmin(ctx);
    const targetUser = findCompanyUser(ctx, admin.companyId, userId);
    if (targetUser.role === "Admin" && targetUser.isActive && countActiveAdmins(ctx, admin.companyId) <= 1) {
      throw new Error("At least one active admin is required.");
    }
    deleteUserRecord(ctx, targetUser.id);
  }
);

export const leaveCompany = spacetimedb.reducer(
  {},
  (ctx: ReducerCtx<S>) => {
    const user = requireActiveUser(ctx);
    if (user.role === "Admin" && countActiveAdmins(ctx, user.companyId) <= 1) {
      throw new Error("Transfer admin role before leaving.");
    }

    deleteUserRecord(ctx, user.id);
  }
);

export const updateCompanyName = spacetimedb.reducer(
  {
    name: t.string(),
  },
  (ctx: ReducerCtx<S>, { name }) => {
    const admin = requireAdmin(ctx);
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw new Error("Company name must be 2-100 characters.");
    }
    const company = ctx.db.company.id.find(admin.companyId);
    if (!company) {
      throw new Error("Company not found.");
    }
    ctx.db.company.id.update({
      ...company,
      name: trimmedName,
    });
  }
);

export const updateCompanySettings = spacetimedb.reducer(
  {
    agentAutoJoin: t.bool(),
    postSummaries: t.bool(),
    notifyRepeatedTopics: t.bool(),
    topicSensitivity: t.string(),
  },
  (ctx: ReducerCtx<S>, { agentAutoJoin, postSummaries, notifyRepeatedTopics, topicSensitivity }) => {
    const admin = requireAdmin(ctx);
    assertValidSensitivity(topicSensitivity);
    const existing = ctx.db.companySetting.companyId.find(admin.companyId);
    const next = {
      companyId: admin.companyId,
      agentAutoJoin,
      postSummaries,
      notifyRepeatedTopics,
      topicSensitivity,
      updatedAt: now(ctx),
    };
    if (existing) {
      ctx.db.companySetting.companyId.update(next);
    } else {
      ctx.db.companySetting.insert(next);
    }
  }
);

// Store meeting summary
export const storeMeetingSummary = spacetimedb.reducer(
  {
    meetingId: t.u64(),
    companyId: t.u64(),
    summaryText: t.string(),
    keyDecisions: t.string(),
    actionItems: t.string(),
  },
  (ctx: ReducerCtx<S>, { meetingId, companyId, summaryText, keyDecisions, actionItems }) => {
    ctx.db.meetingSummary.insert({
      id: 0n,
      meetingId,
      companyId,
      summaryText,
      keyDecisions,
      actionItems,
      generatedAt: now(ctx),
      pineconeIndexed: false,
    });
  }
);

// Mark summary indexed
export const markSummaryIndexed = spacetimedb.reducer(
  {
    summaryId: t.u64(),
  },
  (ctx: ReducerCtx<S>, { summaryId }) => {
    const s = ctx.db.meetingSummary.id.find(summaryId);
    if (s) {
      ctx.db.meetingSummary.id.update({
        ...s,
        pineconeIndexed: true,
      });
    }
  }
);

export default spacetimedb;
