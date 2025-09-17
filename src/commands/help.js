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
          name: "/danbrowse `<tags>` `[rating]`",
          value:
            "Browse through **multiple Danbooru posts** with navigation buttons.\n" +
            "- `tags`: Space-separated list of tags (e.g. `hakurei_reimu armpits`). Autocomplete supported.\n" +
            "- `rating` *(optional)*: `General (g)`, `Sensitive (s)`, `Questionable (q)`, `Explicit (e)`, or `ALL` (any rating).\n" +
            "➡️ Default: `General + Sensitive (g+s)`.\n" +
            "- Buttons: ⬅️ Prev, ➡️ Next, ⏮️ Prev Page, ⏭️ Next Page, ❌ Leave.\n" +
            "⚠️ NSFW ratings (`q`, `e`, `ALL`) are **only allowed in NSFW channels**.",
          inline: false,
        },
        {
          name: "/danrandom `<tags>` `[rating]`",
          value:
            "Fetches a **completely random Danbooru post** with the specified tags.\n" +
            "- `tags`: Space-separated list of tags (e.g. `hakurei_reimu miko`). Autocomplete supported.\n" +
            "- `rating` *(optional)*: `General (g)`, `Sensitive (s)`, `Questionable (q)`, `Explicit (e)`, or `ALL` (any rating).\n" +
            "➡️ Default: `General + Sensitive (g+s)`.\n" +
            "⚠️ NSFW ratings (`q`, `e`, `ALL`) are **only allowed in NSFW channels**.",
          inline: false,
        }
      )
      .setFooter({ text: "Tip: Use tag autocomplete to find popular tags quickly!" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
