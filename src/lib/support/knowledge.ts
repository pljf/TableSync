/**
 * Public product guidance, checked against docs/user-guide.md and the current
 * room, menu and shopping implementations. This module is
 * a deterministic help index, not a trained model or a source of room data.
 */
export type SupportArticle = {
  id: string;
  title: string;
  keywords: string[];
  body: string;
  href: string;
};

type ArticleInput = Omit<SupportArticle, "href">;
const article = (input: ArticleInput): SupportArticle => ({ ...input, href: `/help#${input.id}` });

export const supportArticles: SupportArticle[] = [
  article({
    id: "create-room",
    title: "Start a gathering",
    keywords: ["组局", "创建房间", "建房", "新建聚餐", "发起聚餐", "开始使用", "如何开始", "新手", "人数", "create room", "create gathering", "get started", "guest count", "start a gathering", "host a gathering", "plan a meal", "include myself"],
    body: "Choose Continue as guest, or sign in with GitHub when available, to open My gatherings. Choose New gathering and enter its title, meal type, planned guest count (including yourself), and optional date and total budget. Location, description, and public sharing are optional details. Fill in Your meal preferences, then choose Create room. Your response is included in menu planning. Next, share the invite link, collect guest preferences, and open Plans to generate menus."
  }),
  article({
    id: "invite-guests",
    title: "Invite friends and join a gathering",
    keywords: ["邀请", "邀请链接", "朋友加入", "加入房间", "加入聚餐", "无需注册", "客人注册", "invite", "inviting", "invitation", "join room", "join gathering", "guests need an account", "join a gathering"],
    body: "Copy the invite link from the room page and send it to your friends. They can open it, enter their name, and submit meal preferences without a host account. Collect responses before generating menus and opening voting. Each participant's room identity stays in their browser; different people joining the same room should use separate devices or browser profiles. The public Share link only shows the finalized menu, so use the invite link to collect preferences."
  }),
  article({
    id: "preferences",
    title: "Add dietary preferences and allergies",
    keywords: ["偏好", "过敏", "忌口", "素食", "吃素", "花生", "辣度", "不吃辣", "清真", "犹太", "preferences", "allergy", "allergies", "vegetarian", "vegan", "halal", "kosher", "spice", "dietary"],
    body: "Use the invite form or My preferences to enter your diet, allergies, liked and disliked ingredients, spice tolerance, optional Budget comfort, contribution availability, and notes, then save. You can edit responses while preferences are being collected and during planning. After voting starts, the host must choose Reopen guest preferences and confirm the destructive reset of menus, votes, shopping progress, and contributions before responses can change. If the menu is finalized, first use Revise menu to reopen voting. Planning considers recorded dietary needs. Complete religious-diet certification rules are not implemented."
  }),
  article({
    id: "generate-plans",
    title: "Generate menus and resolve planning problems",
    keywords: ["生成菜单", "生成方案", "菜单推荐", "推荐菜单", "没有合适", "生成失败", "预算", "人均", "generate plans", "generate menu", "menu planning", "no safe menu", "budget", "cost estimate", "generate menus", "generate a menu", "menu suggestions", "menu failed"],
    body: "Once at least one guest response is saved, the host can open Plans and choose Generate plans. Compare the dishes, servings, and estimated total and per-person costs, then let guests vote. If no suitable menu is found, review the generation report and check the total budget and relevant preferences before trying again. Keep real allergy information in place. Automatic grocery assignments consider each volunteer's saved Budget comfort, including their claimed Potluck dishes. Items that do not fit anyone's remaining comfort stay Unassigned. Manual claims and retained assignments may exceed comfort; prices are estimates and do not guarantee a retailer checkout cap."
  }),
  article({
    id: "vote-finalize",
    title: "Vote and finalize a menu",
    keywords: ["投票", "否决", "确定菜单", "敲定菜单", "定稿", "like", "neutral", "veto", "vote", "votes", "voting", "finalize", "finalise"],
    body: "In Plans, vote Like, Neutral, or Veto on a proposed menu. A Veto requires a reason. Hosts can vote using their response from room creation; in older rooms without a host response, choose Add my preferences first. The host chooses Finalize plan to select a menu and generate its shopping list. Other menus remain available for reference. Guest votes alone do not finalize a menu."
  }),
  article({
    id: "edit-menu",
    title: "Change the selected menu and understand editing limits",
    keywords: ["换菜", "改菜单", "修改菜单", "编辑菜单", "份数", "分量", "份量", "几人份", "自定义菜", "自创菜", "自己的菜", "个人菜谱", "私房菜", "edit menu", "servings", "custom recipe", "own dish", "replace dish", "swap dish", "change menu", "change the menu", "edit the menu", "swap a dish", "replace a dish", "portions", "own recipe"],
    body: "This version does not provide individual dish swaps, direct servings edits, or personal recipe entry. To choose a different complete menu after finalization, the host can open Plans, choose Revise menu, confirm that shopping quantities may change, and choose Reopen menu voting. Menus and existing votes stay. The current shopping list stays visible while shopping and Potluck updates are paused. Choose Finalize plan on another available menu to resume shopping. Matching ingredients keep manual assignments, including deliberate unassignments, and purchased status where quantities remain covered; increased quantities need a fresh purchase check and obsolete ingredients are removed. Potluck commitments follow recipes that remain on the chosen menu; larger portions require a fresh readiness check, and removed recipes lose their contribution. Reopening guest preferences is a separate destructive reset of menus, votes, shopping progress, and contributions."
  }),
  article({
    id: "shopping-start",
    title: "Find your shopping list",
    keywords: ["购物清单", "买菜清单", "采购清单", "清单为空", "没有清单", "没有购物", "shopping list", "grocery list", "shopping empty", "waiting for a menu"],
    body: "The shopping list is generated when the host chooses Finalize plan. If you only have guest preferences or menus awaiting votes, open Plans and finalize a menu first. For a finalized Potluck, the shared list can also be empty when every dish has a contributor: each contributor handles all ingredients for their dish. Check the menu page to see those assignments."
  }),
  article({
    id: "shopping-assignment",
    title: "Claim groceries and mark purchases",
    keywords: ["认领", "分工", "谁买", "谁负责", "分配", "买好了", "买完", "已购买", "取消认领", "预算舒适度", "claim item", "release item", "assign", "purchased", "bought", "who buys", "unassigned", "claim groceries", "claim an item", "release an item", "assignment", "assignments", "who is buying", "budget comfort", "retry save", "save automatically"],
    body: "After the menu is finalized, open Shopping. Hosts can choose who is responsible for an item and manage purchase status. Guests can choose Claim item on an unassigned item or Release item on one they own. The host or assigned person can tick Purchased. Assignment changes and purchase checks save immediately: wait for the saved confirmation, or choose Retry save if a change fails. Guests cannot change someone else's assignment or purchase status. Use Mine and Unassigned to find your tasks and items that still need a buyer. Automatic assignments respect each volunteer's saved Budget comfort after accounting for claimed Potluck dishes. Items that do not fit a volunteer's remaining comfort stay Unassigned. Manual claims, reassignments, and retained assignments can exceed comfort; check the estimated assignment totals. Full packages and local checkout prices may cost more than the ingredient estimates."
  }),
  article({
    id: "edit-shopping",
    title: "Shopping changes and current list limits",
    keywords: ["编辑购物", "修改购物", "新增物品", "补充物品", "额外物品", "家里有", "家里已经有", "已有食材", "移除物品", "恢复物品", "删除物品", "数量", "单位", "edit shopping", "add item", "already have", "removed items", "restore item", "extra groceries", "add an item", "at home", "change quantity"],
    body: "This version generates the shopping list from the finalized menu and unclaimed Potluck dishes. It does not provide direct list edits, extra-item entry, an already-at-home mark, or manual item removal and restoration. Keep any extra supplies on a separate list. If you already have the full listed quantity available, the host or assigned person can tick Purchased to record that the item is covered. This saves immediately; wait for the saved confirmation or use Retry save after a failure. For recipe-driven changes, the host can use Revise menu on Plans and finalize another complete menu; matching ingredient assignments and covered purchases are kept, increased quantities need a fresh purchase check, and obsolete ingredients are removed. Guests cannot change another person's assignment or purchase status."
  }),
  article({
    id: "potluck",
    title: "Bring a dish to a Potluck",
    keywords: ["potluck", "带菜", "认领菜", "整道菜", "拼餐", "百乐餐", "contribution", "claim dish", "release dish", "ready to bring"],
    body: "After a Potluck menu is finalized, claim a whole dish on the menu page. Tick Ready to bring and choose Save readiness when it is ready. Only guests who said they can contribute a dish in their preferences can claim one; hosts can also assign dishes to them. Contributors handle all ingredients for their dish, while unclaimed dishes stay on the shared shopping list. Release dish cancels your claim. Claiming or releasing a dish recalculates groceries: unchanged or reduced quantities keep assignments and purchase checks, including deliberate unassignments; increased quantities keep assignments but need a fresh purchase check, and ingredients no longer needed are removed. Confirm the shopping changes when prompted. Changing a contributor leaves groceries unchanged but resets that dish's readiness. Saving readiness alone does not recalculate groceries. Claimed dishes count toward the contributor's Budget comfort before automatic grocery assignments are made."
  }),
  article({
    id: "account-access",
    title: "Guest access, sign-in, and other devices",
    keywords: ["账号", "账户", "登录", "登陆", "注册", "github", "访客", "游客", "跨设备", "换手机", "换电脑", "cookie", "找不到房间", "account", "sign in", "sign up", "signup", "email", "password", "login", "log in", "guest access", "save my rooms", "another device"],
    body: "Continue as guest creates a guest host account in the current browser, with access for up to seven days. Clearing cookies, ending the guest session, or losing the session removes access to that anonymous account's rooms. When GitHub sign-in is configured, choose Save my rooms and connect GitHub to access your hosted rooms on other devices. Your first GitHub sign-in creates an account; there is no separate email/password registration form. Guest preferences and votes use a separate browser session and do not transfer automatically when the host signs in on another device."
  }),
  article({
    id: "room-lifetime",
    title: "Room expiry and deletion",
    keywords: ["过期", "有效期", "保留多久", "七天", "7天", "七 天", "168", "删除房间", "删除聚餐", "恢复房间", "延期", "expiry", "expire", "expires", "expiration", "delete room", "delete gathering", "seven days", "7 days", "delete a room", "delete a gathering", "72 hours", "three days", "scheduled gathering"],
    body: "Every room expires seven days (168 hours) after creation or three days (72 hours) after its scheduled gathering, whichever is later, including rooms hosted through GitHub. Undated rooms expire seven days after creation. Creation and room pages show the expiration date. Changing the gathering date updates expiration; other edits and connecting an account do not extend it. Guest-account session lifetime is separate from room retention. Expired rooms become inaccessible immediately; their data is permanently deleted by the next successful scheduled cleanup. Hosts can choose Delete room on the overview and confirm permanent deletion sooner. This removes preferences, menus, votes, shopping progress, and invite and share links. Deleted rooms cannot be restored."
  }),
  article({
    id: "saved-templates",
    title: "Plan another gathering",
    keywords: ["模板", "下次再用", "复用", "再办一次", "重复聚餐", "保存菜单", "saved templates", "save template", "reuse", "repeat gathering"],
    body: "This version does not provide saved menu templates or a workflow to copy a menu into a new gathering. Choose New gathering to create a separate room with its own settings. Collect the new group's preferences, generate complete menus, vote, and finalize a plan. Existing room responses, votes, shopping progress, and Potluck assignments are not transferred. Sign in with GitHub when configured to access your hosted rooms across devices; guest hosts otherwise depend on their browser session."
  }),
  article({
    id: "restart-planning",
    title: "Revise a menu or reopen preferences",
    keywords: ["重新收集", "重新投票", "撤销确定", "撤回确定", "取消确定", "重新选择菜单", "reopen preferences", "undo finalization", "restart planning", "revise menu", "reopen menu voting"],
    body: "On a finalized menu, the host can open Plans, choose Revise menu, confirm that shopping quantities may change, and choose Reopen menu voting. Menus and existing votes remain. The current shopping list stays visible while shopping and Potluck updates are paused until a menu is finalized again. Matching ingredients retain assignments, including deliberate unassignments, and purchase checks where quantities remain covered. Increased quantities need a fresh purchase check; obsolete ingredients are removed. Potluck commitments follow recipes that remain on the chosen menu; larger portions require a fresh readiness check, and contributions for removed recipes are cleared. To collect preferences again, use Reopen guest preferences during voting and confirm the destructive removal of menus, votes, shopping progress, and contributions. After finalization, first use Revise menu to reopen voting."
  }),
  article({
    id: "sharing-sync",
    title: "Share a menu and see updates",
    keywords: ["公开分享", "分享菜单", "只读", "不同步", "刷新", "看不到更新", "更新失败", "同步", "read only", "share menu", "public sharing", "sync", "refresh", "retry"],
    body: "When public sharing is enabled and a menu is finalized, use the Share link to let others view the final menu in read-only mode. Use the room's invite link to collect meal preferences. Open room pages check for shared updates about every eight seconds while preserving unsaved drafts. If a shared update fails, use the page's retry control. Submit edited preferences or room details with that form's save control. Shopping assignments and Purchased checks save immediately; wait for the saved confirmation or choose Retry save if they fail."
  })
];

export type SupportHistoryMessage = { role: "user" | "assistant"; content: string };

// Broad product nouns help navigation, but should not outrank a specific task.
const broadKeywords = new Set(["购物清单", "买菜清单", "采购清单", "shopping list", "grocery list", "偏好", "preferences", "人数", "数量", "单位", "账号", "账户", "访客", "游客", "account", "分工", "认领", "分配", "预算", "budget", "同步", "sync"]);

// Joining guests use a different identity from the account that hosts rooms.
const participantAccountPatterns = [
  /\b(?:guests?|friends?|invitees?|people|participants?|attendees?)\b.{0,35}\b(?:need|require|make|create|have|register|sign)\b.{0,25}\b(?:accounts?|register|sign.?in|sign.?up)\b/u,
  /\b(?:accounts?|register|registration|sign.?up|sign.?in)\b.{0,35}\b(?:join(?:ing)?|invited|guests?|friends?)\b/u,
  /\b(?:guests?|friends?|invitees?|people|participants?|attendees?)\b.{0,35}\b(?:log.?in|sign.?in|sign.?up|register|accounts?)\b.{0,40}\b(?:join(?:ing)?|submit(?:ting)?|respond(?:ing)?|vote|voting)\b/u
];

const intentPatterns: Record<string, RegExp[]> = {
  "create-room": [/(?:create|start|host) (?:a |new |a new )?(?:room|gathering)\b/u, /(?:guest count|how many guests|include myself)/u],
  "invite-guests": [
    /\b(?:invite|inviting|invitation)\b/u,
    ...participantAccountPatterns,
    /\b(?:join|joining|get guests? into)\b.{0,20}\b(?:room|gathering)\b/u,
    /\b(?:link|url)\b.{0,50}\b(?:send|give|share|copy)\b.{0,25}\b(?:guests?|friends?|people|invitees?)\b/u,
    /\b(?:send|give|share|copy)\b.{0,30}\b(?:guests?|friends?|invitees?)\b.{0,20}\b(?:link|url)\b/u
  ],
  "preferences": [/(?:update|change|add|save).{0,20}(?:dietary|preferences|allergies)/u],
  "edit-menu": [/(改|换|编辑|调整|增加|删除|移除|减少).{0,8}(菜单|菜品|份数|分量|份量)/u, /(菜单|菜品).{0,8}(改|换|编辑|调整|加|删)/u, /(自己的菜|自定义菜|自创菜|个人菜谱|私房菜)/u, /\b(?:edit(?:ed|ing)?|chang(?:e|ed|ing)|swap(?:ping|ped)?|replac(?:e|ed|ing)|substitut(?:e|ed|ing)|switch(?:ed|ing)?|add|remove|adjust)\b.{0,25}\b(?:menu|dish|dishes|servings|portions)\b/u, /\b(?:swap|replace|substitute|switch)\b.{0,25}\b(?:meal|recipe|option)\b/u, /\b(?:menu|dish|meal) (?:swaps?|changes?|edits?|replacements?)\b/u, /\b(?:cheaper|less expensive|lower cost)\b.{0,20}\b(?:dish|meal|recipe|alternative|option)\b/u, /(?:add|use).{0,20}(?:own|custom|personal) (?:recipe|dish)/u],
  "edit-shopping": [/(购物|清单|物品|食材).{0,12}(编辑|改名|修改|改数量|添加|增加|移除|删除|恢复)/u, /(编辑|修改|添加|增加|移除|删除|恢复).{0,8}(购物|清单|物品|食材)/u, /\b(?:edit|add|remove|restore|recover|change)\b.{0,25}\b(?:shopping|grocery|groceries|items?|quantity)\b/u, /\b(?:add|put|include|insert)\b.{0,65}\b(?:on|in|to|into) (?:the |my |our |a )?(?:(?:(?:shopping|grocery) )?list|groceries)\b/u, /\b(?:restore|recover|bring back)\b.{0,20}\b(?:items?|one|something)\b.{0,20}\b(?:removed|deleted)\b/u],
  "shopping-start": [/(购物|清单).{0,8}(空|没有|没出现|没生成|不显示|在哪)/u, /(?:shopping|grocery).{0,16}(?:empty|missing|not ready|not showing)/u, /(?:where|find).{0,20}(?:shopping|grocery) list/u],
  "shopping-assignment": [/(认领|分配|分工|谁买|谁负责).{0,8}(购物|采购|买菜|食材|物品)/u, /(购物|采购|清单|食材|物品).{0,8}(认领|分配|分工|谁买|负责)/u, /\b(?:claim|assign|reassign|release|split|divide|delegate|take over)\b.{0,25}\b(?:grocery|groceries|items?|shopping)\b/u, /\b(?:shopping|grocery|groceries|items?)\b.{0,25}\b(?:assignment|assignments|duties|tasks|responsibility|responsibilities)\b/u, /\b(?:mark|save|record)\b.{0,30}\b(?:purchased|bought|purchase)\b/u, /\b(?:budget comfort|retry save|save automatically)\b/u],
  "potluck": [/(认领|分配|带).{0,5}(一道|整道|菜品|带菜)/u, /(?:claim|assign|release|bring).{0,12}(?:whole |a |my )?dish/u],
  "account-access": [
    /\b(?:access|see|view|open|find|manage|use|log.?in|sign.?in)\b.{0,65}\b(?:another|different|new|second|other) (?:device|computer|phone|laptop|browser)s?\b/u,
    /\b(?:another|different|new|second|other) (?:device|computer|phone|laptop|browser)s?\b.{0,65}\b(?:access|see|view|open|find|manage|use|log.?in|sign.?in)\b/u,
    /\b(?:access|see|view|open|find|manage)\b.{0,25}\b(?:my|our) (?:hosted )?(?:rooms?|gatherings?)\b/u,
    /\b(?:access|see|view|open|find|manage)\b.{0,25}\b(?:rooms?|gatherings?) (?:that )?i host\b/u
  ],
  "room-lifetime": [/(房间|聚餐).{0,8}(删除|恢复|过期|消失|有效|到期)/u, /(?:room|gathering).{0,16}(?:last|expire|deleted|disappear)/u, /(?:delete|restore|recover).{0,12}(?:room|gathering)/u, /how long.{0,20}(?:room|gathering)/u],
  "saved-templates": [/(菜单|聚餐).{0,8}(复用|模板|再用)/u, /save.{0,16}menu.{0,24}(?:next time|again|template)/u, /(?:repeat|reuse).{0,16}(?:menu|gathering)/u],
  "restart-planning": [/(撤回|撤销|取消).{0,6}(菜单|确定|定稿)/u, /reopen.{0,12}preferences/u, /(?:undo|cancel).{0,12}finali[sz]/u, /\b(?:revis(?:e|ed|ing)|reopen)\b.{0,20}\bmenu(?: voting)?\b/u],
  "generate-plans": [/(菜单|方案).{0,8}(生成不了|生成失败|无法生成|怎么生成|如何生成)/u, /generate.{0,12}(?:menus?|plans?)/u, /(?:menus?|plans?).{0,16}(?:fail|cannot|can't)/u],
  "sharing-sync": [/(?:share|sharing).{0,12}(?:menu|link)/u, /(?:see|seeing|missing).{0,12}updates/u]
};

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[’‘]/gu, "'").replace(/\s+/gu, " ").trim();
}

function containsKeyword(question: string, keyword: string): boolean {
  // English word boundaries keep “plan” from matching unrelated “planet”.
  if (/^[a-z0-9 ]+$/u.test(keyword)) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "u").test(question);
  }
  return question.includes(keyword);
}

function rankArticles(question: string): { article: SupportArticle; score: number }[] {
  const participantAccess = participantAccountPatterns.some((pattern) => pattern.test(question));
  return supportArticles.map((entry) => {
    const matches = entry.keywords.filter((keyword) => containsKeyword(question, normalize(keyword)));
    const hasIntent = !(entry.id === "account-access" && participantAccess)
      && intentPatterns[entry.id]?.some((pattern) => pattern.test(question));
    // Changes to a menu are the cause of these effects. A broad shopping or
    // voting noun should not displace the article that explains that cause.
    const menuEffects = ["edit-menu", "restart-planning"].includes(entry.id) && hasIntent
      && /\b(?:votes|ratings|shopping|groceries|purchases|assignments|quantities)\b/u.test(question);
    const score = matches.reduce((total, keyword) => total + (broadKeywords.has(keyword) ? 1 : 3), 0)
      + (hasIntent ? 8 : 0) + (menuEffects ? 8 : 0)
      + (entry.id === "invite-guests" && participantAccess ? 8 : 0);
    return { article: entry, score };
  }).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score);
}

function isVotingFollowUp(question: string): boolean {
  return /^(?:(?:and )?(?:what|how) about )?(?:the |my |our )?votes[?!.]*$/u.test(question)
    || /^(?:does|will) (?:that|it|this) (?:reset|clear|remove|erase).{0,25}\b(?:votes|ratings)[?!.]*$/u.test(question)
    || /^(那|那么)?(之前的|原来的|我的)?投票(会清空|还保留|怎么办)?[?？!！。]*$/u.test(question);
}

function isFollowUp(question: string): boolean {
  const compact = question.replace(/[\s?？!！。.,，]/gu, "");
  return /^(那|那么|这样|这|它)?(会|能|可以|还会|还可以)?(清空|保留|恢复|删除|修改|更改|保存)(吗|呢|么)?$/u.test(compact)
    || /^(那|那么)?(已经|之前|原来)?(买好的|买完的|买过的|已买的|已购的|购物进度|已购状态|购买状态|购物分工|认领的|分工)(还在|还保留|会保留|会丢|会清空|怎么办)?(吗|呢)?$/u.test(compact)
    || /^(那|那么)?(数量|份数|分量|份量)(增加|减少|变多|变少)(了)?(怎么办)?(吗|呢)?$/u.test(compact)
    || /^(那|那么)?(具体|详细)?(怎么做|如何操作|怎么操作|怎么恢复|怎么修改|怎么保存|步骤)(呢|吗)?$/u.test(compact)
    || /^(然后呢|再详细一点|详细说说|能详细说说吗|可以详细说一下吗)$/u.test(compact)
    || /^(how do i do that|can you explain more|what happens then|will that be saved|can i undo that|will (?:it|they|that) (?:be kept|be saved|stay)|what about (?:the )?(?:items (?:i )?(?:already )?bought|items already purchased|existing assignments|shopping assignments|purchased items))[?!.]*$/u.test(question)
    || /^(?:(?:and )?(?:what|how) about |and )?(?:the |my |our )?(?:items|stuff|groceries|food)(?: (?:i(?:'ve| have)?|we(?:'ve| have)?))? (?:already )?(?:paid for|bought|purchased)[?!.]*$/u.test(question)
    || /^(?:are|will) (?:my|our|the) purchases (?:still )?(?:be )?(?:counted|kept|saved|covered)[?!.]*$/u.test(question)
    || /^(?:please )?(?:walk me through (?:it|that)|explain (?:it|that))(?: (?:one )?step(?:s)?(?: at a time| by step)?)?[?!.]*$/u.test(question)
    || /^what if (?:the )?(?:quantity|quantities|servings|portions) (?:increases?|decreases?|go (?:up|down)|goes (?:up|down))[?!.]*$/u.test(question)
    || /^what if i (?:increase|decrease) (?:the )?(?:quantity|quantities|servings|portions)[?!.]*$/u.test(question)
    || isVotingFollowUp(question);
}

/** Returns only public articles; it never executes requests or reads private data. */
export function findSupportArticles(question: string, history: SupportHistoryMessage[] = []): SupportArticle[] {
  const query = normalize(question.slice(0, 4_000));
  if (!query) return [];
  let ranked = rankArticles(query);
  // Only narrowly recognized follow-ups inherit context, and only from users.
  // An unrelated new question must not be answered with a stale earlier topic.
  if (isFollowUp(query)) {
    // A standalone question about votes can still use the voting guide. Other
    // ambiguous follow-ups require a relevant user topic before this message.
    const votingFollowUp = isVotingFollowUp(query);
    ranked = votingFollowUp ? ranked.filter(({ article: entry }) => entry.id === "vote-finalize") : [];
    const previousUsers = history.slice(-8).filter((message) => message.role === "user").reverse();
    for (const previous of previousUsers) {
      const priorQuery = normalize(previous.content.slice(0, 4_000));
      if (isFollowUp(priorQuery)) continue;
      const contextual = rankArticles(priorQuery);
      if (contextual.length) {
        // Votes after a menu change concern revision effects, rather than
        // generic voting steps. Do not attach votes to an unrelated help topic.
        const voteContext = contextual.filter(({ article: entry }) => ["edit-menu", "restart-planning", "vote-finalize"].includes(entry.id));
        if (!votingFollowUp || voteContext.length) ranked = votingFollowUp ? voteContext : contextual;
      }
      // An unrelated intervening question ends the earlier topic.
      break;
    }
  }
  if (!ranked.length) return [];
  const threshold = Math.max(1, ranked[0].score * 0.4);
  return ranked.filter(({ score }) => score >= threshold).slice(0, 3).map(({ article: entry }) => entry);
}
