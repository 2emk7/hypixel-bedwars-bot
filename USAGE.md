# Using the Bedwars Bot

Four slash commands. Type `/` in any channel the bot is in and pick one — Discord will show the
options as you fill them in.

---

## `/stats`

Look up a player's Bedwars stats.

```
/stats user:<minecraft-username>
```

**Example:** `/stats user:Technoblade`

Returns a card with: star, coins, winstreak, wins/losses, WLR, final kills/deaths, FKDR, kills/deaths,
KDR, beds broken, games played, and win rate.

If a stat shows **Hidden**, that player has turned off Hypixel's public API for that data — the bot
isn't broken, it just genuinely can't see it.

---

## `/track`

Live-track a player for up to an hour. Posts one message that updates itself every 3 seconds with:

- Whether they're online, and if so, what game/mode/map they're currently in
- A note whenever one of their games ends while you're watching

```
/track user:<minecraft-username> duration:<minutes, 1-60>
```

**Example:** `/track user:Technoblade duration:20`

The card keeps updating in place — no spam, just the same message refreshing — and stops on its own
once the duration runs out. It also stops if it can't reach the player's status (e.g. they've hidden
their online status), in which case it'll say so instead of guessing.

Only one `/track` session per player per channel at a time — if you try to start a second one for
someone already being tracked there, the bot will tell you to `/untrack` first.

---

## `/untrack`

Stop a `/track` session early.

```
/untrack user:<minecraft-username>
```

**Example:** `/untrack user:Technoblade`

Only works on a session that's currently running in the same channel. The reply is only visible to
you.

---

## `/apinew` — owner only

Rotates the bot's Hypixel API key without editing files or restarting.

```
/apinew key:<new-hypixel-api-key>
```

This one only works for whoever owns the bot's Discord application — everyone else will get a polite
"only the owner can do that" instead. The reply is only visible to the person who ran it, and the key
itself is never shown back in chat.

---

## Tips

- Usernames aren't case-sensitive and don't need quotes.
- If a lookup fails with "Couldn't find a Minecraft account," double-check the spelling — it has to be
  a real, current Minecraft username.
- If `/track` says a stat is missing or errors out mid-session, it's usually a temporary Hypixel API
  hiccup — the card will recover on its next 3-second refresh.
