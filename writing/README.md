# Writing

One essay = up to three files, all keyed by the same id (the URL slug):

    writing/<id>.md          the text. First line is the title: `# Title`
    writing/<id>.json        OPTIONAL: a reading, in the colin repo's narration format
    writing/<id>/NNN.mp3     the reading's audio, in parts

Then add an entry to `WRITING` in `site/content.js`.

A reading is made once and committed, never synthesised per play. Two ways,
both from the `colin` repo, and the player cannot tell them apart:

    # Colin's cloned voice (costs ElevenLabs credits ONCE). --dry costs nothing.
    npm run bake-narration -- essays/<id>.md --dry
    npm run bake-narration -- essays/<id>.md --title "..."

    # your own recording, aligned (costs nothing)
    npm run align-narration -- reading.mp3 essays/<id>.md --words reading.json

Copy `public/narration/<id>.json` and `public/narration/<id>/` here. The `marks`
in each part drive the word highlighting and mini-Colin's mouth.
