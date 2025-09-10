const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("danbrowse")
    .setDescription("Browse Danbooru images for given tags")
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

    let page = 1; // pagination
    let data = [];

    // fetch posts
    const fetchPage = async (pageNum) => {
      const url = `https://danbooru.donmai.us/posts.json?tags=${formattedTags}&limit=25&page=${pageNum}`;
      const response = await fetch(url, {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.DANBOORU_USERNAME}:${process.env.DANBOORU_API_KEY}`
            ).toString("base64"),
        },
      });
      return await response.json();
    };

    data = await fetchPage(page);

    if (!data.length) {
      return interaction.reply({
        content: "❌ No results found for those tags.",
        ephemeral: true,
      });
    }

    let index = 0;

    const buildEmbed = (post, idx) => {
      const imageUrl = post.file_url || post.large_file_url || post.preview_file_url;
      const ratingMap = { g: "General", s: "Sensitive", q: "Questionable", e: "Explicit" };

      return new EmbedBuilder()
        .setTitle(`Danbooru Post #${post.id}`)
        .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
        .setImage(imageUrl)
        .setFooter({ text: `Result ${idx + 1} of ${data.length} | Page ${page} | Danbooru` })
        .setColor(0xFF8603)
        .addFields(
          { name: "Tags", value: tags.replace(/,/g, ", ") || "None", inline: false },
          { name: "Artist", value: post.tag_string_artist || "Unknown", inline: true },
          { name: "Copyright", value: post.tag_string_copyright || "Unknown", inline: true },
          { name: "Characters", value: post.tag_string_character || "None", inline: false },
          { name: "Rating", value: rating === "any" ? "Any" : ratingMap[post.rating] || post.rating, inline: true }
        );
    };

    // create navigation buttons
    const makeRow = (disabled = false) =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️ Prev")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ➡️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("prevpage")
          .setLabel("⏮️ Prev Page")
          .setStyle(ButtonStyle.Success)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("nextpage")
          .setLabel("Next Page ⏭️")
          .setStyle(ButtonStyle.Success)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("leave")
          .setLabel("❌ Leave")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disabled)
      );

    const message = await interaction.reply({
      embeds: [buildEmbed(data[index], index)],
      components: [makeRow()],
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      time: 5 * 60 * 1000,
    });

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "❌ Only the command user can use these buttons.",
          ephemeral: true,
        });
      }

      if (i.customId === "prev") {
        index = (index - 1 + data.length) % data.length;
      } else if (i.customId === "next") {
        index = (index + 1) % data.length;
      } else if (i.customId === "nextpage") {
        page++;
        data = await fetchPage(page);
        index = 0;
        if (!data.length) {
          page--; // roll back if no next page
          return i.reply({ content: "❌ No more results available.", ephemeral: true });
        }
      } else if (i.customId === "prevpage") {
        if (page > 1) {
          page--;
          data = await fetchPage(page);
          index = 0;
        } else {
          return i.reply({ content: "⚠️ You are already on the first page.", ephemeral: true });
        }
      } else if (i.customId === "leave") {
        collector.stop("user_exit");
        return i.update({
          components: [makeRow(true)],
        });
      }

      await i.update({
        embeds: [buildEmbed(data[index], index)],
        components: [makeRow()],
      });
    });

    collector.on("end", async () => {
      await message.edit({ components: [makeRow(true)] });
    });
  },
};
