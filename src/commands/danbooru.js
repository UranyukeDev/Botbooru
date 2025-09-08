const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("danbooru")
    .setDescription("Fetch a random image from the latest Danbooru posts with given tags")
    .addStringOption(option =>
      option
        .setName("tags")
        .setDescription("Comma-separated tags to search for")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("rating")
        .setDescription("Filter by rating")
        .addChoices(
          { name: "General", value: "g" },
          { name: "Sensitive", value: "s" },
          { name: "Questionable", value: "q" },
          { name: "Explicit", value: "e" }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    const tags = interaction.options.getString("tags");
    const rating = interaction.options.getString("rating");

    // prevent posting lewd content in non-NSFW channels
    if ((rating === "q" || rating === "e") && !interaction.channel.nsfw) {
      return interaction.reply({
        content: "⚠️ This command can only be used in **NSFW channels** when selecting `Questionable` or `Explicit` rating.",
        ephemeral: true,
      });
    }

    // convert comma-separated tags into Danbooru format
    let formattedTags = tags.split(",").map(tag => tag.trim()).join("+");

    if (!rating) {
      formattedTags += "+rating:g,s";
    } else {
      formattedTags += `+rating:${rating}`;
    }

    const url = `https://danbooru.donmai.us/posts.json?tags=${formattedTags}&limit=100`;

    try {
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
        // if no posts found, call tagsearch
        const tagSearchUrl = `https://danbooru.donmai.us/tags.json?search[name_matches]=*${encodeURIComponent(tags)}*&limit=10&order=count`;
        const tagResp = await fetch(tagSearchUrl, {
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                `${process.env.DANBOORU_USERNAME}:${process.env.DANBOORU_API_KEY}`
              ).toString("base64"),
          },
        });
        const tagData = await tagResp.json();

        if (!tagData.length) {
          return interaction.reply({
            content: "❌ No results or similar tags found.",
            ephemeral: true,
          });
        }

        // clean tag names and remove trailing underscores and 0 usage
        const tagMap = {};
        tagData.forEach(t => {
          if (t.post_count === 0) return;
          let cleanName = t.name.replace(/\(.*?\)/g, "").replace(/_+$/g, "");
          tagMap[cleanName] = t.post_count;
        });

        const tagList = Object.entries(tagMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name], index) => {
            const link = `[${name}](https://danbooru.donmai.us/posts?tags=${encodeURIComponent(name)})`;
            return index < 5 ? `**${link}**` : link;
          })
          .join("\n");

        const embed = new EmbedBuilder()
          .setTitle(`No results found. Did you mean?`)
          .setDescription(tagList)
          .setColor(0xA60000)
          .setFooter({ text: "Danbooru" });

        return interaction.reply({ embeds: [embed] });
      }

      // pick a random post (change later by popularity???)
      const post = data[Math.floor(Math.random() * data.length)];
      const imageUrl = post.file_url || post.large_file_url || post.preview_file_url;

      if (!imageUrl) {
        return interaction.reply({
          content: "❌ No image found for that post.",
          ephemeral: true,
        });
      }

      const ratingMap = { g: "General", s: "Sensitive", q: "Questionable", e: "Explicit" };

      const embed = new EmbedBuilder()
        .setTitle(`Danbooru Post #${post.id}`)
        .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
        .setImage(imageUrl)
        .addFields(
          { name: "Artist", value: post.tag_string_artist || "Unknown", inline: true },
          { name: "Copyright", value: post.tag_string_copyright || "Unknown", inline: true },
          { name: "Characters", value: post.tag_string_character || "None", inline: false },
          { name: "Rating", value: ratingMap[post.rating] || post.rating, inline: true }
        )
        .setFooter({ text: "Danbooru" })
        .setColor(0xFFBF00);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "❌ Error fetching data from Danbooru.",
        ephemeral: true,
      });
    }
  },
};
