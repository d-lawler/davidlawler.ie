// Copy for each stop on the pretentiousness slider.
// `{rad}` in a bio marks where the Research and Destroy link is rendered.

export interface Level {
    name: string
    bio: string
    emailPre: string
    emailLink: string
    emailPost: string
}

export const levels: Level[] = [
    {
        name: 'Plain',
        bio: 'I design and build websites. I work at Google. I also run a small studio called {rad}.',
        emailPre: '',
        emailLink: 'Email me',
        emailPost: '.',
    },
    {
        name: 'Professional',
        bio: 'Creative Director and Technologist, working with international clients across the cultural sector, on Identity and Digital Experience. Currently at Google Brand Studio, EMEA. Always at {rad}.',
        emailPre: 'Feel free to ',
        emailLink: 'email me',
        emailPost: '.',
    },
    {
        name: 'Considered',
        bio: 'Designer and technologist, working where brand systems meet the web. A decade of identities, design systems and sites for Pentagram, Manual, Mixcloud and Noë & Associates, and a long tail of photographers, galleries and hotels. Now leading creative at Google Brand Studio, EMEA. Still running {rad}, a studio named, half seriously, after its method.',
        emailPre: 'I would welcome an ',
        emailLink: 'email',
        emailPost: '.',
    },
    {
        name: 'Curatorial',
        bio: 'A practice situated at the intersection of identity, technology and the cultural apparatus. Trained in Visual Communication at the National College of Art & Design, Dublin; schooled since by Pentagram, Manual and a decade of independent commissions for galleries, archives, members’ clubs and the occasional radio station. Presently directing creative within Google Brand Studio, EMEA, while sustaining {rad} as an ongoing inquiry rather than a business.',
        emailPre: 'Correspondence is, of course, ',
        emailLink: 'welcomed',
        emailPost: '.',
    },
    {
        name: 'Insufferable',
        bio: 'Mine is less a career than a sustained interrogation of the interface as cultural artefact: a dialectic between the systematic and the sensual, the grid and its discontents. From the Liffey Valley to the Thames, I have pursued what might be called a typographic ethics, in which the design system is not tooling but epistemology. That Google, Pentagram and Mixcloud have, at various points, chosen to underwrite this inquiry reflects less on me than on them. {rad} remains the laboratory. Everything else is fieldwork.',
        emailPre: 'Should you feel so compelled, one might ',
        emailLink: 'initiate a correspondence',
        emailPost: '.',
    },
    {
        name: 'Confession',
        bio: 'You’ll have noticed the plain version came first. That was the trick. A site this sparse lets me be pretentious under the guise of being unpretentious, which is about as Machiavellian as a personal website gets. The slider was never about tone; it was about how badly I need you to think well of me. I am not an intellectual. I own the books, not the reading. I make websites, mostly at {rad}, which is mostly me.',
        emailPre: 'Please ',
        emailLink: 'email me',
        emailPost: '. Please.',
    },
]

export const radLabel = 'Research and Destroy'
