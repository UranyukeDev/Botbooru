const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands and how to use them"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("📖 Bot Help Menu")
      .setDescription("Here are all the available commands and how to use them:")
      .setColor(0x3498db)
      .addFields(
        {
          name: "/danbooru `<tags>` `[rating]`",
          value:
            "Fetches a **random image** from Danbooru based on given tags.\n" +
            "- `tags`: Comma-separated list of tags (e.g. `hakurei_reimu,armpits`).\n" +
            "- `rating` *(optional)*: Choose between `General (g)`, `Sensitive (s)`, `Questionable (q)`, `Explicit (e)`, or `ALL` (any rating). *By default (g+s)*\n" +
            "⚠️ NSFW ratings (`q`, `e`, `ALL`) can only be used in NSFW channels.",
          inline: false,
        },
        {
          name: "/danbrowse `<tags>` `[rating]`",
          value:
            "Browse through multiple Danbooru posts with **navigation buttons**.\n" +
            "- Buttons: ⬅️ Prev, ➡️ Next, ⏮️ Prev Page, ⏭️ Next Page, ❌ Leave.\n" +
            "- Each page contains **25 results**.\n" +
            "- `rating` *(optional)*: Choose between `General (g)`, `Sensitive (s)`, `Questionable (q)`, `Explicit (e)`, or `ALL` (any rating). *By default (g+s)*\n" +
            "⚠️ NSFW ratings (`q`, `e`, `ALL`) can only be used in NSFW channels.",
          inline: false,
        },
        {
          name: "/tagsearch `<tag>`",
          value:
            "Helps you find **related tags** if you’re not sure about the spelling.\n" +
            "- Example: `/tagsearch reimu` → suggests similar tags like `hakurei_reimu`.\n" +
            "- Useful when `/danbooru` or `/danbrowse` finds no results.",
          inline: false,
        }
      )
      .setFooter({ text: "." });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
