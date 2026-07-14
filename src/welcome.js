import { EmbedBuilder } from "discord.js";

export function buildWelcomeEmbed(member) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`\u{1F331} Welcome, ${member.displayName} \u2014 glad you're here.`)
    .setDescription(
      "You've just joined **KEEPGOING Trading Group**, and before anything else, here's what this place actually is:\n\n" +
        "This isn't a signals channel. Nobody's here to hand you the \"easy button.\" What you'll find instead is a real, honest look at what it actually takes to become consistent \u2014 the process, the discipline, the self-review most traders skip because it's uncomfortable.\n\n" +
        "You're starting a path, not a shortcut. Take your time, look around, and when you're ready:\n\n" +
        "\u{1F4D6} Start here \u2192 <#1526522662799802470>\n" +
        "\u{1F9E9} Learn the framework \u2192 <#1526355352474488905>\n" +
        "\u{1F44B} Say hello \u2192 <#1526355313979297862>\n\n" +
        "Glad to have you. Let's keep going."
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();
}
