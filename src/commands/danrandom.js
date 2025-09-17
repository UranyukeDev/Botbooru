const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("danrandom")
    .setDescription("Fetch a random Danbooru image for given tags")
    .addStringOption(option =>
      option
        .setName("tag1")
        .setDescription("First tag")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName("tag2")
        .setDescription("Second tag (optional)")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName("rating")
        .setDescription("Filter by rating")
        .addChoices(
          { name: "General", value: "g" },
          { name: "Sensitive", value: "s" },
          { name: "Questionable", value: "q" },
          { name: "Explicit", value: "e" },
          { name: "ANY", value: "any" }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    const tag1 = interaction.options.getString("tag1");
    const tag2 = interaction.options.getString("tag2");
    const rating = interaction.options.getString("rating");

    if ((rating === "q" || rating === "e" || rating === "any") && !interaction.channel.nsfw) {
      return interaction.reply({
        content: "⚠️ This command can only be used in **NSFW channels** when selecting `Questionable`, `Explicit`, or `ANY` rating.",
        flags: 64,
      });
    }

    let formattedTags = [tag1, tag2].filter(Boolean).join("+");
    if (!rating) {
      formattedTags += "+rating:g,s";
    } else if (rating !== "any") {
      formattedTags += `+rating:${rating}`;
    }

    const url = `https://danbooru.donmai.us/posts/random.json?tags=${formattedTags}`;

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

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const post = await response.json();
      if (!post || !post.id) {
        return interaction.reply({
          content: "❌ No results found for those tags.",
          flags: 64,
        });
      }

      const imageUrl = post.file_url || post.large_file_url || post.preview_file_url;
      const ratingMap = { g: "General", s: "Sensitive", q: "Questionable", e: "Explicit" };

      const embed = new EmbedBuilder()
        .setTitle(`Danbooru Post #${post.id}`)
        .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
        .setImage(imageUrl)
        .setColor(0xFFBF00)
        .addFields(
          { name: "Tags", value: [tag1, tag2].filter(Boolean).join(", ") || "None", inline: false },
          { name: "Artist", value: post.tag_string_artist || "Unknown", inline: true },
          { name: "Copyright", value: post.tag_string_copyright || "Unknown", inline: true },
          { name: "Characters", value: post.tag_string_character || "None", inline: false },
          { name: "Rating", value: rating === "any" ? "Any" : ratingMap[post.rating] || post.rating, inline: true }
        )
        .setFooter({ text: "Danbooru" });

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "❌ Error fetching data from Danbooru.",
        flags: 64,
      });
    }
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    if (!focused) return interaction.respond([]);

    try {
      const url = `https://danbooru.donmai.us/tags.json?search[name_matches]=${encodeURIComponent(focused)}*&limit=10&search[order]=count`;
      const resp = await fetch(url, {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${process.env.DANBOORU_USERNAME}:${process.env.DANBOORU_API_KEY}`).toString("base64"),
        },
      });
      const tags = await resp.json();

      const choices = tags
        .filter(t => t.post_count > 0)
        .slice(0, 10)
        .map(t => ({
          name: `${t.name} (${t.post_count})`,
          value: t.name,
        }));

      await interaction.respond(choices);
    } catch (err) {
      console.error("Autocomplete error:", err);
      await interaction.respond([]);
    }
  }
};
