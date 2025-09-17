# BooruBot

**Discord bot that fetches and shares images from Danbooru.**

### Implemented things
- `/danbrowse tags:<tags> rating:<rating>` → browses Danbooru's images for chosen tags
- `/danrandom tags:<tags> rating:<rating>` → pulls a completely random image for those tags instead of browsing.
- `/tagsearch tag:<tag>` → takes a user-provided tag and returns the most popular or closest matching tags from Danbooru

### Planned things
- `/taginfo tag:<tag>` → fetches description, usage count, and related tags from Danbooru’s tag API.
- **Blacklist System** → Let server admins or users blacklist tags
- **Image Source Finder** → Given an image link or upload, query SauceNAO or IQDB to find the Danbooru entry.
- **Rate Limits / Cooldowns** → Prevent spam by limiting requests per user
