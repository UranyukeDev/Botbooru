const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tagsearch")
    .setDescription("Search for the closest and most popular Danbooru tags")
    .addStringOption(option =>
      option
        .setName("tag")
        .setDescription("The tag to search for")
        .setRequired(true)
    ),
  async execute(interaction) {
    const tag = interaction.options.getString("tag").trim();

    try {
      // fetch matching tags from Danbooru
      const url = `https://danbooru.donmai.us/tags.json?search[name_matches]=*${encodeURIComponent(tag)}*&limit=25&order=count`;
      const response = await fetch(url, {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.DANBOORU_USERNAME}:${process.env.DANBOORU_API_KEY}`
            ).toString("base64"),
        },
      });

      const data = await response.json();

      if (!data.length) {
        return interaction.reply({
          content: "❌ No tags found matching that query.",
          ephemeral: true,
        });
      }

      // merge tags by cleaned name (remove parentheses but keep underscores)
      const tagMap = {};
      data.forEach(t => {
        if (t.post_count === 0) return; // skip unused tags
        let cleanName = t.name.replace(/\(.*?\)/g, ""); // remove parentheses
        cleanName = cleanName.replace(/_+$/g, ""); // remove trailing underscores
        if (tagMap[cleanName]) {
          tagMap[cleanName] += t.post_count;
        } else {
          tagMap[cleanName] = t.post_count;
        }
      });

      // convert to array and sort by post count descending
      const tagArray = Object.entries(tagMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // make tags clickable and first 5 tags bold
      const tagList = tagArray
        .map(([name], index) => {
          const link = `[${name}](https://danbooru.donmai.us/posts?tags=${encodeURIComponent(name)})`;
          return index < 5 ? `**${link}**` : link;
        })
        .join("\n");

      if (!tagList) {
        return interaction.reply({
          content: "❌ No popular tags found after filtering.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`Tag search results for "${tag}"`)
        .setDescription(tagList)
        .setColor(0xFFBF00)
        .setFooter({ text: "Danbooru" });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "❌ Error fetching tags from Danbooru.",
        ephemeral: true,
      });
    }
  },
};
