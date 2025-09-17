const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("danrandom")
    .setDescription("Fetch a random Danbooru image for given tags")
    .addStringOption(option =>
      option
        .setName("tags")
        .setDescription("Comma-separated tags to search for")
        .setRequired(true)
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
    const tags = interaction.options.getString("tags");
    const rating = interaction.options.getString("rating");

    // prevent posting lewd content in non-NSFW channels
    if ((rating === "q" || rating === "e" || rating === "any") && !interaction.channel.nsfw) {
      return interaction.reply({
        content: "⚠️ This command can only be used in **NSFW channels** when selecting `Questionable`, `Explicit`, or `ANY` rating.",
        ephemeral: true,
      });
    }

    // format tags
    let formattedTags = tags.split(",").map(tag => tag.trim()).join("+");
    if (!rating) {
      formattedTags += "+rating:g,s"; // default safe-ish
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
          ephemeral: true,
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
          { name: "Tags", value: tags.replace(/,/g, ", ") || "None", inline: false },
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
        ephemeral: true,
      });
    }
  },
  
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused(); // current text being typed
    if (!focusedValue) {
      return interaction.respond([]); // empty until user starts typing
    }

    try {
      const url = `https://danbooru.donmai.us/tags.json?search[name_matches]=${focusedValue}*&limit=10&search[order]=count`;
      const response = await fetch(url, {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.DANBOORU_USERNAME}:${process.env.DANBOORU_API_KEY}`
            ).toString("base64"),
        },
      });

      const tags = await response.json();

      // filter out tags with 0 post count
      const filtered = tags.filter(tag => tag.post_count > 0);

      // return up to 10 suggestions
      const choices = filtered.map(tag => ({
        name: `${tag.name} (${tag.post_count})`,
        value: tag.name,
      }));

      await interaction.respond(choices.slice(0, 10));
    } catch (err) {
      console.error("Autocomplete error:", err);
      await interaction.respond([]);
    }
  }
};
