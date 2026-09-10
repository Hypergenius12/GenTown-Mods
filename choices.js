message: (subject, target, args) => `Should residents of {{regname:town|${target.id}}} be weird?`,
    messageDone: (subject, target, args) => `{{regname:town|${target.id}}} are weird.`,
    messageNo: (subject, target, args) => `{{regname:town|${target.id}}} are not weird.`,
    weight: $c.COMMON,
message: (subject, target, args) => `Should residents of {{regname:town|${target.id}}} be anti-${args.value}?`,
    messageDone: (subject, target, args) => `{{regname:town|${target.id}}} are anti-${args.value}.`,
    messageNo: (subject, target, args) => `{{regname:town|${target.id}}} are not pro-${args.value}.`,
    weight: $c.COMMON,
// i'll keep updating this
