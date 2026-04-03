export interface ExhibitContent {
  id: string;
  headline: string;
  category: string;
  era: string;
  origin: string;
  keyFacts: { label: string; value: string }[];
  quote?: { text: string; attribution: string };
  lead: string;
  body: string[];
  connections: { label: string; path: string }[];
}

const exhibits: Record<string, ExhibitContent> = {

  'enigma-i': {
    id: 'enigma-i',
    headline: 'The Machine That Nearly Won the War',
    category: 'Electromechanical Cipher Machine',
    era: '1930 – 1945',
    origin: 'Nazi Germany',
    keyFacts: [
      { label: 'Invented by', value: 'Arthur Scherbius, 1918' },
      { label: 'Rotors', value: '3 from a set of 5, plus reflector' },
      { label: 'Plugboard settings', value: '10 pairs — 150 trillion combinations' },
      { label: 'Total key space', value: '~10¹⁶ (more than all grains of sand on Earth)' },
      { label: 'First broken by', value: 'Marian Rejewski, Poland, 1932' },
      { label: 'Security status', value: 'Broken — 1932 (Poland), 1940 (Bletchley)' },
    ],
    quote: {
      text: 'The Enigma is unbreakable. The machine itself is so sophisticated that it would take the entire war effort to even come close to solving it.',
      attribution: 'German Wehrmacht manual, 1940',
    },
    lead: `On a cold morning in December 1932, a 27-year-old Polish mathematician named Marian Rejewski sat down with a stack of intercepted German radio messages and a intuition about group theory that would change the course of history. Within weeks, he had done what Germany believed to be mathematically impossible: he reconstructed the internal wiring of the Enigma machine from ciphertext alone — without ever seeing the device.`,
    body: [
      `The Enigma was born not as a military weapon but as a commercial product. Arthur Scherbius, a German electrical engineer, patented a rotor-based cipher machine in 1918 and offered it to the German Navy. They declined. He exhibited it at the International Postal Congress in 1923. Bankers and diplomats expressed polite interest. The machine sat largely unsold until the German military, scarred by the intelligence failures of the First World War, began buying heavily in the late 1920s. By 1939, the Wehrmacht had distributed over 30,000 units across every branch of its armed forces.`,
      `The machine's genius — and its eventual undoing — lay in its combination of three mechanisms. Three rotors, each containing a scrambled alphabet, stepped like an odometer with each keypress, ensuring that the same letter never encrypted to the same output twice in a row. A reflector sent the electrical signal back through the rotors on a return path, making encryption and decryption identical operations. A plugboard, added to the military version, swapped ten pairs of letters before and after the rotors, adding a further layer of scrambling that multiplied the key space into the quadrillions. Operators could set the machine in more configurations than there are grains of sand on Earth.`,
      `What defeated it was not mathematics alone but a combination of human error, structural weakness, and extraordinary intellectual effort. Rejewski exploited a procedural flaw: operators were required to transmit the message key twice at the start of each message, a security measure against transmission errors that inadvertently gave cryptanalysts a mathematical handhold. From those doubled keys, Rejewski reconstructed the wiring of all three rotors. When Germany eliminated the doubled indicator in 1938 and expanded the rotor set from 3 to 5, Poland shared everything it knew with Britain and France — just weeks before the invasion.`,
      `At Bletchley Park, Alan Turing and Gordon Welchman built on the Polish foundation. Turing's Bombe machine automated the search for rotor settings by exploiting "cribs" — guessed plaintext. Welchman added the diagonal board, which slashed the search space. But the Enigma's most famous weakness was one of its own design: a rotor could never encrypt a letter to itself. This single constraint — a consequence of the reflector — gave codebreakers their most reliable foothold. A crib could be ruled out instantly if any letter mapped to itself. The Germans never realized they had built their own defeat into the machine.`,
      `By 1943, Bletchley Park was reading the majority of German Enigma traffic, often within hours of transmission. The intelligence, codenamed ULTRA, was so sensitive that Churchill personally ordered that its source never be revealed — even allowing some attacks to proceed unchallenged rather than tip off Germany that their cipher was broken. Historians estimate that ULTRA shortened the war in Europe by at least two years. Arthur Scherbius died in a horse-carriage accident in 1929, never knowing what his invention would become.`,
    ],
    connections: [
      { label: 'Enigma M4', path: '/enigma-m4' },
      { label: 'Enigma I Wiring Explorer', path: '/enigma-i-wiring' },
      { label: 'The Bombe', path: '/bombe' },
      { label: 'Typex (British answer)', path: '/typex' },
    ],
  },

  'enigma-m4': {
    id: 'enigma-m4',
    headline: 'The Blackout: Ten Months of Silence in the Atlantic',
    category: 'Naval Cipher Machine',
    era: '1942 – 1945',
    origin: 'Nazi Germany — Kriegsmarine',
    keyFacts: [
      { label: 'Introduced', value: 'February 1, 1942 — "Shark" blackout' },
      { label: 'Rotors', value: '4 (thin Beta/Gamma + 3 from set of 8)' },
      { label: 'Additional rotor', value: 'Doubled key space vs. Enigma I' },
      { label: 'Blackout duration', value: '10 months — Feb to Dec 1942' },
      { label: 'U-boats sunk, 1942', value: '~85; Allied ships lost: ~1,000' },
      { label: 'Broken by', value: 'Hut 8, Bletchley Park, Dec 1942' },
    ],
    quote: {
      text: 'The only thing that ever really frightened me during the war was the U-boat peril.',
      attribution: 'Winston Churchill, The Second World War',
    },
    lead: `At midnight on February 1, 1942, the German Navy's U-boat fleet switched to a new Enigma variant with four rotors instead of three. In an instant, every message the Kriegsmarine had ever sent became irrelevant, every technique Bletchley Park had developed became useless. For the next ten months, the codebreakers at Hut 8 stared at complete silence. In the Atlantic, Allied ships burned.`,
    body: [
      `The four-rotor Enigma — designated M4 by the Navy and codenamed "Shark" by British codebreakers — was the German Navy's response to a growing unease about Enigma's security. Grand Admiral Karl Dönitz had long suspected his codes were compromised. U-boats were being ambushed at rendezvous points, supply submarines were being sunk with uncanny precision. A security review found no proof of a breach, but Dönitz pushed for a more secure system regardless. The fourth rotor was the answer.`,
      `The new rotor — Beta or Gamma — was a thin wheel slotted behind the standard reflector, effectively creating a unique reflector for every setting of that rotor. It didn't step during operation, but its 26 positions multiplied the key space by 26. For Hut 8, led by Alan Turing and then Hugh Alexander, it was a catastrophe. The bombes designed for three-rotor Enigma couldn't handle four rotors without a complete redesign. The first four-rotor bombe didn't come online until June 1943.`,
      `The ten-month blackout coincided with the worst period of the Battle of the Atlantic. In 1942, U-boats sank over 1,000 Allied ships — more than 6 million tons of shipping. The convoys carrying food, fuel, and weapons to Britain were being hunted systematically, their routes calculated by German intelligence that was, ironically, itself being decrypted by Bletchley. The Allies were reading German surface fleet messages but were blind to the submarines hunting their convoys.`,
      `The break came through a combination of cribs, captured material, and the reckless repetition that plagued German signal procedure throughout the war. Weather ships and supply U-boats used abbreviated Enigma settings that gave Hut 8 a mathematical toehold. In December 1942, three Bletchley mathematicians — Peter Twinn, Alan Turing, and Hugh Alexander — cracked "Shark." By the spring of 1943, the U-boat offensive was broken. In May 1943 alone, 43 U-boats were sunk. Dönitz withdrew his fleet from the North Atlantic and wrote in his diary that "we had lost the Battle of the Atlantic."`,
      `The M4's fourth rotor was a genuine security improvement over the three-rotor machine — it simply came too late, was deployed with the same procedural weaknesses as its predecessor, and faced an adversary that had already spent a decade learning to read its ancestor. The machine itself sits today in the collection of the National Museum of Computing at Bletchley Park.`,
    ],
    connections: [
      { label: 'Enigma I', path: '/enigma-i' },
      { label: 'Enigma M4 Wiring Explorer', path: '/enigma-wiring' },
      { label: 'The Bombe', path: '/bombe' },
    ],
  },

  'caesar': {
    id: 'caesar',
    headline: 'The First Cipher of the Western World',
    category: 'Monoalphabetic Substitution Cipher',
    era: '~100 BC – Present',
    origin: 'Roman Republic',
    keyFacts: [
      { label: 'Used by', value: 'Julius Caesar, Roman military, ~50 BC' },
      { label: 'Method', value: 'Shift each letter by a fixed amount (usually 3)' },
      { label: 'Key space', value: '25 possible keys' },
      { label: 'First documented break', value: 'Al-Kindi, Baghdad, c. 850 AD' },
      { label: 'Time to brute-force', value: 'Seconds — by hand' },
      { label: 'Security status', value: 'Completely broken' },
    ],
    quote: {
      text: 'He wrote in cipher — that is, by so changing the order of the letters of the alphabet, that not a word could be made out.',
      attribution: 'Suetonius, The Twelve Caesars, c. 121 AD',
    },
    lead: `Two thousand years ago, Julius Caesar sent military dispatches across his empire using a cipher so simple a child could break it. He shifted every letter of his message three places forward in the alphabet — A became D, B became E — and trusted that the barbarians intercepting his couriers wouldn't know what to do with the scrambled result. He was probably right. For its time, it worked.`,
    body: [
      `The historian Suetonius describes Caesar's cipher in his biography written around 121 AD: "If he had anything confidential to say, he wrote it in cipher, that is, by so changing the order of the letters of the alphabet, that not a word could be made out." His nephew Augustus used a similar system but with a shift of one — and crucially, without the wraparound, so Z was written as AA. Neither scheme would survive scrutiny for a moment today, but the Roman world had no systematic cryptanalysis. Secrecy came from obscurity, not mathematics.`,
      `The Caesar cipher is a special case of a broader class called monoalphabetic substitution ciphers, where each letter of the plaintext is consistently replaced by a single ciphertext letter. The shift cipher has only 25 non-trivial keys (a shift of 26 returns the original text), making exhaustive search trivial even by hand. A more general monoalphabetic cipher — where the substitution need not be a simple shift — has 26! possible keys, roughly 4 × 10²⁶. But even this vast number provides no real security, because the key is not random: the substitution must preserve the statistical fingerprint of the underlying language.`,
      `The man who understood this first was Abu Yusuf al-Kindi, a ninth-century Arab polymath writing in Baghdad around 850 AD. His "Manuscript on Deciphering Cryptographic Messages" describes frequency analysis with startling clarity: each language has letters that appear more often than others. In English, E is the most common letter, appearing roughly 12% of the time. T, A, O, I, N follow closely. By counting the frequency of symbols in a ciphertext and matching them to the expected frequencies of the language, any monoalphabetic cipher — regardless of its key — can be broken. Al-Kindi's insight predated the European Renaissance by six centuries.`,
      `Despite being cryptographically trivial, the Caesar cipher appears everywhere. ROT13 — a shift of 13 — is used on internet forums to hide spoilers. The Hebrew "atbash" cipher used in the Old Testament is a reflection cipher. The Caesar cipher's enduring presence in education, puzzles, and culture reflects its role as the foundation: the point at which the concept of substitution becomes concrete. Every cipher discussed in this museum — from the Vigenère to the Enigma to AES — is either a direct descendant or a reaction to the problem that Caesar illustrated and Al-Kindi solved.`,
    ],
    connections: [
      { label: 'Frequency Analysis', path: '/frequency-analysis' },
      { label: 'Vigenère Cipher', path: '/vigenere' },
      { label: 'Affine Cipher', path: '/affine' },
      { label: 'Substitution Solver', path: '/substitution-solver' },
    ],
  },

  'vigenere': {
    id: 'vigenere',
    headline: 'Three Hundred Years of False Security',
    category: 'Polyalphabetic Substitution Cipher',
    era: '1553 – 1863',
    origin: 'France / Italy',
    keyFacts: [
      { label: 'Actually invented by', value: 'Giovan Battista Bellaso, Italy, 1553' },
      { label: 'Misattributed to', value: 'Blaise de Vigenère (a different cipher)' },
      { label: 'Called', value: '"Le chiffre indéchiffrable" — the unbreakable cipher' },
      { label: 'First broken by', value: 'Charles Babbage, ~1854 (unpublished)' },
      { label: 'Published break', value: 'Friedrich Kasiski, 1863' },
      { label: 'Method of attack', value: 'Kasiski examination + Index of Coincidence' },
    ],
    quote: {
      text: 'This cipher is so strong that I challenge anyone in the world to break it.',
      attribution: 'Blaise de Vigenère, Traicté des Chiffres, 1586',
    },
    lead: `For three centuries, the Vigenère cipher bore the nickname "le chiffre indéchiffrable" — the unbreakable cipher. Diplomats, generals, and spies used it to protect their most sensitive communications, confident that no human mind could unravel it. They were wrong. The cipher had been silently broken by an English mathematician in the 1850s. He never published his result.`,
    body: [
      `The cipher that bears Vigenère's name was not, in fact, invented by him. The actual polyalphabetic substitution cipher described in this simulator was devised by Giovan Battista Bellaso, an Italian cryptographer who published it in 1553. Blaise de Vigenère — a French diplomat and cryptographer who worked in Rome — invented a different, autokey cipher and described Bellaso's work in his 1586 treatise without adequate attribution. Over the following centuries, through a chain of misreadings and misattributions, the cipher became associated with Vigenère's name. The confusion persists to this day.`,
      `The cipher's apparent strength derives from its use of multiple Caesar shifts cycling through a keyword. If the keyword is SECRET, the first letter is shifted by 18 (S), the second by 4 (E), the third by 2 (C), and so on, repeating when the keyword is exhausted. Because the same plaintext letter can encrypt to many different ciphertext letters — and the same ciphertext letter can represent many different plaintext letters — frequency analysis fails. The statistical fingerprint of the language is scrambled across as many alphabets as the keyword has letters.`,
      `Charles Babbage, inventor of the Difference Engine and conceptual father of the computer, broke the Vigenère cipher sometime around 1854. His notes survive. He identified repeated sequences in the ciphertext and measured the distances between them — reasoning that repetitions were likely caused by the same plaintext aligning with the same part of the keyword. The distances between repetitions would tend to be multiples of the keyword length. From the keyword length, the cipher decomposed into parallel Caesar ciphers, each solvable by frequency analysis. Babbage, characteristically, never published. The reason is unclear — some historians suggest he was working for British intelligence.`,
      `Friedrich Kasiski, a Prussian infantry officer with no formal mathematical training, independently discovered the same attack and published it in 1863 in a 95-page book that initially attracted little attention. The Kasiski examination, as it came to be called, was soon combined with William Friedman's Index of Coincidence — a statistical measure that estimates keyword length without requiring repeated sequences — to produce a reliable, systematic method for breaking any Vigenère-enciphered text of sufficient length. The "unbreakable" cipher had been thoroughly broken within a decade of Kasiski's publication.`,
      `The Vigenère cipher's three-century run is a lesson in the difference between obscurity and security. No cryptanalyst published a break before 1863, but that silence wasn't proof of strength — it reflected the slow diffusion of knowledge, the reluctance to publish military secrets, and the absence of formal cryptanalytic methods. The cipher was always breakable; it simply hadn't been broken in public yet. This pattern — confidence in a system whose weaknesses are not yet widely known — recurs throughout the history of cryptography.`,
    ],
    connections: [
      { label: 'Vigenère Breaker', path: '/vigenere-breaker' },
      { label: 'Index of Coincidence', path: '/ioc' },
      { label: 'Vigenère Workshop', path: '/vigenere-workshop' },
      { label: 'Autokey Cipher', path: '/autokey' },
      { label: 'Caesar Cipher', path: '/caesar' },
    ],
  },

  'bombe': {
    id: 'bombe',
    headline: 'The Machine That Broke the Machine',
    category: 'Electromechanical Cryptanalytic Device',
    era: '1940 – 1945',
    origin: 'Bletchley Park, Britain',
    keyFacts: [
      { label: 'Designed by', value: 'Alan Turing (1939), refined by Gordon Welchman' },
      { label: 'Based on', value: 'Polish Bomba, designed by Marian Rejewski' },
      { label: 'Built by', value: 'British Tabulating Machine Company' },
      { label: 'Total built', value: '210 machines by war\'s end' },
      { label: 'Daily throughput', value: 'Thousands of Enigma keys tested per day' },
      { label: 'Key insight', value: 'Enigma could never encrypt a letter to itself' },
    ],
    quote: {
      text: 'It is perhaps the biggest contribution a single individual has ever made to the Allied victory in World War II.',
      attribution: 'Gordon Welchman, on Turing\'s Bombe, The Hut Six Story',
    },
    lead: `In the summer of 1939, with war weeks away, Polish mathematicians handed British intelligence something priceless: the complete design of the Enigma machine and a working electromechanical device — the Bomba — that had already been used to break early Enigma settings. Alan Turing took the Polish work, identified its fatal dependency on a procedural flaw the Germans had just eliminated, and designed something new. Something that would work on the Enigma as it actually was.`,
    body: [
      `The Polish Bomba worked by exploiting operators' habit of transmitting the three-letter message key twice at the start of each session — a doubled indicator that gave cryptanalysts a mathematical relationship between positions 1–3 and 4–6 of every message. When Germany eliminated the doubled indicator in September 1938, the Bomba became useless overnight. What Turing inherited was a powerful idea — use the cipher machine's own behavior against it — without the specific vulnerability that had made it work.`,
      `Turing's design rested on a different vulnerability, one baked into the Enigma's hardware rather than its operating procedure. The reflector, which bounced the electrical signal back through the rotors on its return path, had one inescapable consequence: a letter could never encrypt to itself. Press A, and you would get any letter except A. This constraint, while seeming minor, provided something invaluable to cryptanalysts: a fast way to eliminate wrong guesses. If any proposed matching of ciphertext to plaintext produced a letter encrypting to itself, that rotor setting could be instantly discarded.`,
      `The attack required a "crib" — a stretch of guessed plaintext. Weather reports often began with "WETTER" (weather). Messages to high command often contained formulaic phrases. Messages sent late in the war sometimes contained the word "KEINE" (none) in standard positions. Given a crib and its corresponding ciphertext, the Bombe tested rotor positions systematically, scanning through thousands of settings and rejecting any that contradicted the no-self-encryption rule. Valid candidates were sent to the codebreakers for manual verification.`,
      `Gordon Welchman's critical contribution — the diagonal board — came from a realization that the consistency constraints between letters in the crib propagated through the plugboard in predictable ways. His addition to Turing's design reduced the number of candidates that passed the Bombe's test from hundreds to a handful, making the attack practical for the first time. Welchman's own account suggests that Turing, when shown the diagonal board concept, said simply: "You know, I've been worrying about this." He had identified the same problem. Welchman had the solution.`,
      `By 1943, Bletchley Park operated over 200 Bombes running around the clock, cracking the majority of Enigma traffic across all services. The machines were housed at Bletchley and at outstations in places like Eastcote and Stanmore, staffed largely by Wrens — women of the Women's Royal Naval Service — who ran and maintained the machines under strict secrecy. Most operators didn't know what the machines were doing. After the war, the Bombes were destroyed and the staff sworn to silence. The full story wasn't declassified until the 1970s, leaving Alan Turing to face prosecution for homosexuality in 1952 with his greatest achievement still secret.`,
    ],
    connections: [
      { label: 'Enigma I', path: '/enigma-i' },
      { label: 'Enigma M4', path: '/enigma-m4' },
      { label: 'Colossus', path: '/colossus' },
      { label: 'Frequency Analysis', path: '/frequency-analysis' },
    ],
  },

  'colossus': {
    id: 'colossus',
    headline: 'The Computer That Never Existed',
    category: 'Programmable Electronic Computer',
    era: '1943 – 1945 (classified until 1975)',
    origin: 'Bletchley Park — Post Office Research Station, Britain',
    keyFacts: [
      { label: 'Designed by', value: 'Tommy Flowers, Post Office Research Station' },
      { label: 'First operational', value: 'February 5, 1944' },
      { label: 'Final count', value: '10 Colossus computers by war\'s end' },
      { label: 'Target', value: 'Lorenz SZ42 — "Tunny" — German High Command cipher' },
      { label: 'Vacuum tubes', value: 'Colossus Mk 2: 2,400 valves' },
      { label: 'Declassified', value: '1975 — 30 years of secrecy' },
    ],
    quote: {
      text: 'Tommy Flowers should be remembered as one of the greatest engineers of the twentieth century. But because of the Official Secrets Act, almost nobody has heard of him.',
      attribution: 'Dr. Simon Lavington, computer historian',
    },
    lead: `In the autumn of 1943, Tommy Flowers — a Post Office telephone engineer who had been told his design was too ambitious and too unreliable — built the world's first programmable electronic computer in his own time, partly with his own money, in direct defiance of his supervisors. It worked. It was immediately put to work breaking Hitler's most secret communications. Then it was destroyed, and its existence was classified for thirty years.`,
    body: [
      `The machine that Colossus was built to attack was nothing like Enigma. The Lorenz SZ42 was a teleprinter cipher attached to a twelve-wheel mechanism that XORed the plaintext against a pseudo-random keystream — conceptually closer to a one-time pad than to a rotor machine. It was used exclusively for Hitler's strategic communications with his field marshals. Breaking it didn't just give the Allies tactical intelligence; it gave them operational strategic intelligence at the highest level. Eisenhower called it "of priceless value."`,
      `The cryptanalytic breakthrough came before Colossus existed. In August 1941, German operators sent a 4,000-character message, and when the recipient asked for a retransmission, they sent it again — with slightly different settings for their twelve Lorenz wheels, but the same message start indicator. The resulting two ciphertexts, XORed together, canceled the keystream and left the XOR of the two plaintexts. From this, the brilliant mathematician Bill Tutte spent months reconstructing the complete logical structure of the Lorenz machine — wheel counts, pin patterns, the XOR logic — entirely from ciphertext, without ever seeing the device. It remains one of the most remarkable feats of cryptanalysis in history.`,
      `Once the Lorenz's structure was known, breaking individual messages still required enormous computation: testing every possible starting position of all twelve wheels against the intercepted ciphertext. The first approach used a device called the Heath Robinson — named after a cartoonist known for absurdly complicated machines — which was electromechanical, unreliable, and slow. Tommy Flowers, who had spent years at the Post Office Research Station designing telephone exchange electronics, saw the problem and proposed an all-electronic solution using vacuum tubes. His superiors told him it wouldn't work. He built it anyway.`,
      `Colossus used 1,500 vacuum tubes (2,400 in the Mk 2) not for memory or storage but purely for logic — performing Boolean operations on a stream of paper tape running at 5,000 characters per second. It wasn't a general-purpose computer in the modern sense: it had no stored program, no floating-point arithmetic, no ability to run arbitrary software. But it was programmable — its plugboards and switches could be reconfigured to perform different logical analyses — and it was electronic, operating at speeds no mechanical device could approach. It was a machine designed for one purpose and it executed that purpose flawlessly.`,
      `After the war, Churchill personally ordered all ten Colossus computers destroyed and the blueprints burned. The engineers were sworn to secrecy under the Official Secrets Act. When the history of computing was written in the 1950s and 1960s, ENIAC and UNIVAC got the credit for being "firsts." The Americans who built ENIAC — completed in 1945, a year after Colossus Mk 2 — had no idea they weren't first. Tommy Flowers received a £1,000 bonus for his contribution to the war effort — not enough to repay the money he had personally invested. He died in 1998, recognized near the end of his life but never fully celebrated. A working replica of Colossus was rebuilt at Bletchley Park and completed in 2007.`,
    ],
    connections: [
      { label: 'Lorenz SZ42', path: '/lorenz-sz42' },
      { label: 'Lorenz Visualizer', path: '/lorenz-wiring' },
      { label: 'The Bombe', path: '/bombe' },
      { label: 'LFSR', path: '/lfsr' },
    ],
  },

  'lorenz-sz42': {
    id: 'lorenz-sz42',
    headline: 'Hitler\'s Private Line',
    category: 'Teleprinter Cipher Attachment',
    era: '1941 – 1945',
    origin: 'Nazi Germany — Wehrmacht High Command',
    keyFacts: [
      { label: 'Manufacturer', value: 'Lorenz AG, Berlin' },
      { label: 'Wheels', value: '12 total: 5 Chi, 5 Psi, 2 Motor' },
      { label: 'Codename (British)', value: '"Tunny"' },
      { label: 'Target traffic', value: 'Hitler to field marshals — highest strategic level' },
      { label: 'Machine reconstructed from', value: 'Ciphertext alone — Bill Tutte, 1942' },
      { label: 'Broken by', value: 'Colossus, Bletchley Park, 1944' },
    ],
    quote: {
      text: 'The Lorenz traffic gave us the plans and intentions of the German High Command. We knew what Hitler was thinking.',
      attribution: 'F.H. Hinsley, British Intelligence in the Second World War',
    },
    lead: `The Lorenz SZ42 was not a cipher machine that soldiers carried to the front. It was a device the size of a typewriter that sat in Hitler's bunker, attached to a teleprinter, scrambling direct communications to Rommel in North Africa, von Rundstedt in France, and Army Group commanders on the Eastern Front. The intelligence it protected was the most sensitive of the war — and it was broken by a man who had never seen the machine.`,
    body: [
      `Where Enigma was used by hundreds of thousands of Wehrmacht soldiers for tactical and operational communications, the Lorenz was reserved for the very top. Fewer than a dozen of the machines existed. The messages they carried were Hitler's own strategic directives, the kind of intelligence that could change the outcome of entire campaigns. Allied cryptanalysts at Bletchley Park called this traffic "Fish" and the Lorenz specifically "Tunny." Breaking it wasn't just an intelligence asset — it was a window directly into the mind of the German High Command.`,
      `The Lorenz worked on a different principle from Enigma. Rather than routing electrical current through physical rotors, it used twelve rotating wheels with adjustable pins to generate a pseudo-random bitstream. Each character of the teleprinter message was represented in Baudot code — a five-bit binary code — and each bit was XORed with a corresponding bit from the keystream. XOR is the simplest possible encryption: 0 XOR 1 = 1, 1 XOR 1 = 0. If the keystream is truly random and never repeated, XOR encryption is theoretically unbreakable — it becomes a one-time pad. The Lorenz's weakness was that its keystream was not truly random; it was generated by a deterministic mechanism that eventually repeated.`,
      `The critical blunder that exposed the Lorenz came in August 1941. A German operator sent a long message from Athens to Vienna. The recipient — possibly because of line noise — asked for a retransmission. The operator reset the Lorenz wheels to the same starting position and sent the message again, but this time he made small typing changes along the way: abbreviations, corrections, a different sign-off. The result: two different plaintexts, encrypted with the identical keystream. When the British interceptor station at Knockholt received both transmissions, analyst John Tiltman recognized the repeated start indicator and performed a depth attack — XORing the two ciphertexts to cancel the keystream and expose the XOR of the two messages. From two messages in depth, the entire keystream could be reconstructed, and from the keystream and one known message, the other plaintext emerged.`,
      `Bill Tutte, a 24-year-old chemist-turned-mathematician at Bletchley, spent three months studying the decrypted output trying to reverse-engineer the machine's structure. Working only from the statistical properties of the keystream, he deduced that the Lorenz had twelve wheels, determined the number of cams on each wheel, and reconstructed the complete logical circuit. His work — described as "one of the greatest intellectual achievements of the war" — was accomplished without seeing a single Lorenz machine. Germany had sent thousands of intercepted messages through a device whose entire design was now known to the enemy.`,
    ],
    connections: [
      { label: 'Colossus', path: '/colossus' },
      { label: 'Lorenz Visualizer', path: '/lorenz-wiring' },
      { label: 'LFSR', path: '/lfsr' },
      { label: 'One-Time Pad', path: '/otp' },
    ],
  },

  'sigaba': {
    id: 'sigaba',
    headline: 'The One They Never Broke',
    category: 'Electromechanical Cipher Machine',
    era: '1941 – 1959',
    origin: 'United States',
    keyFacts: [
      { label: 'Designed by', value: 'William Friedman & Frank Rowlett, 1935–1940' },
      { label: 'Rotors', value: '15 total: 5 cipher, 5 control, 5 index' },
      { label: 'Stepping mechanism', value: 'Pseudo-random, controlled by index rotors' },
      { label: 'Broken by adversaries', value: 'Never' },
      { label: 'Retired', value: '1959 (replaced by KL-7)' },
      { label: 'Classification', value: 'Classified until 1996' },
    ],
    quote: {
      text: 'The SIGABA was the one machine the Germans and Japanese never broke. That fact alone speaks to its design.',
      attribution: 'David Kahn, The Codebreakers',
    },
    lead: `Every major cipher machine of the Second World War was broken by the enemy — the German Enigma, the Japanese Purple, the Italian C-38, the British TypeX. Every one except SIGABA. The American ECM Mark II stood alone at the end of the war with its security intact, its traffic unread by any adversary, its design unpenetrated. It was the most secure rotor cipher machine ever fielded in wartime.`,
    body: [
      `The key to SIGABA's security lay in its stepping mechanism. In Enigma, the rotors stepped in a predictable, odometer-like pattern — cryptanalysts could calculate exactly which positions each rotor would be in after any given number of keypresses. In SIGABA, the five cipher rotors were stepped not by mechanical gearing but by the output of the five control rotors, which were themselves controlled by the five index rotors. At each keypress, the index rotors determined which of the control rotors stepped, and the control rotors determined which of the cipher rotors stepped. The resulting stepping pattern was irregular, complex, and — unlike Enigma's — effectively impossible to predict without knowing all fifteen rotor starting positions.`,
      `The machine was designed by William Friedman, the father of American cryptanalysis, and Frank Rowlett, the man who would go on to break the Japanese Purple cipher. Friedman had spent the 1930s studying the vulnerabilities of rotor machines, including Enigma, and was determined to eliminate the predictable stepping that gave Bletchley Park its foothold. His solution — using the output of one bank of rotors to control another — created a cascade of irregularity that defied systematic analysis.`,
      `SIGABA was so highly classified that it was never sent overseas unguarded. When Churchill and Roosevelt met at sea, their communications used SIGABA, but the machines were never left in the same location as the messages they protected. A courier carried the SIGABA separately from the traffic it had encrypted. The machine weighed 90 pounds and required special handling. Its size, weight, and operational complexity made it unsuitable for tactical field use — it was a strategic machine, used for the highest-level communications between Washington and the theater commanders.`,
      `Germany's and Japan's failure to break SIGABA was not for lack of trying. German signals intelligence captured several Enigma codebreaking successes in the early war and was actively working on Allied cipher machines. Japanese cryptanalysts attacked every American system they encountered. Neither made any known progress against SIGABA. Some historians attribute this simply to never capturing a machine intact; others point to the genuine mathematical strength of the irregular stepping. The full German and Japanese records remain partially classified. What's certain is that in the entire war, no SIGABA message was compromised by enemy cryptanalysis.`,
    ],
    connections: [
      { label: 'Enigma I (by contrast)', path: '/enigma-i' },
      { label: 'SIGABA Wiring Explorer', path: '/sigaba-wiring' },
      { label: 'Purple (Japanese equivalent)', path: '/purple' },
      { label: 'KL-7 (successor)', path: '/kl7' },
    ],
  },

  'purple': {
    id: 'purple',
    headline: 'Magic: Reading Japan\'s Most Secret Dispatches',
    category: 'Stepping-Switch Cipher Machine',
    era: '1939 – 1945',
    origin: 'Imperial Japan',
    keyFacts: [
      { label: 'Japanese designation', value: 'Angōki Taipu-B (Type B Cipher Machine)' },
      { label: 'US codename', value: '"Purple"' },
      { label: 'Intelligence codename', value: '"Magic"' },
      { label: 'Mechanism', value: 'Telephone stepping switches, not rotors' },
      { label: 'Fatal flaw', value: 'Vowels and consonants encrypted separately' },
      { label: 'Broken by', value: 'Frank Rowlett, SIS team, September 18, 1940' },
    ],
    quote: {
      text: 'It was a feat which, in the history of cryptanalysis, had no equal.',
      attribution: 'David Kahn, on breaking Purple, The Codebreakers',
    },
    lead: `On September 18, 1940, a team of American codebreakers at the Army's Signal Intelligence Service worked through the night and read, for the first time, a message that Japan's Foreign Ministry believed to be absolutely secure. They had broken the Purple cipher — not by capturing the machine, not by a procedural error, not by a stroke of luck, but by reconstructing it, circuit by circuit, in their heads. They called the intelligence it produced "Magic." It would read Japanese diplomatic traffic until Pearl Harbor and beyond.`,
    body: [
      `The Purple cipher machine was Japan's most advanced cryptographic system, built to protect communications between Tokyo and its ambassadors in Berlin, Washington, London, and Rome. Unlike Enigma, it used no rotors. Instead, it relied on telephone stepping switches — 25-point switches that advanced in irregular patterns under the control of a plugboard-like key setup. This gave it a completely different mathematical structure from European rotor machines, one that the American codebreakers had never seen before.`,
      `The break came from a structural weakness that seems obvious in hindsight but required months of brilliant analysis to identify. The Japanese alphabet was divided into two groups: the six vowels (A, E, I, O, U, Y) and the twenty consonants. Purple encrypted each group through a separate mechanism — the vowels through one path, the consonants through another. This division, introduced to match the electrical architecture of the stepping switches, had a cryptanalytic consequence: it preserved the frequency distribution within each group. In Japanese diplomatic language, certain patterns of vowel use were highly regular. The separation of alphabets gave Frank Rowlett a mathematical handhold.`,
      `What makes the Purple break extraordinary is that the SIS team built a working American Purple machine without ever seeing the Japanese original. They deduced the number and type of stepping switches, the wiring, the key generation mechanism, and the plugboard arrangement purely from the statistical properties of intercepted ciphertext. When they finally had an opportunity to examine a captured Japanese Purple machine after the war, they found it was virtually identical to what they had built. The Japanese design and the American reconstruction agreed in almost every detail.`,
      `The intelligence flowing through the Purple channel — codenamed "Magic" by the Americans — gave Washington extraordinary insight into Japanese diplomatic intentions throughout 1940 and 1941. The Magic summaries were among the most closely guarded secrets of the US government, distributed only to the president, the secretaries of state, war, and the navy, and the chiefs of staff. Historians have debated ever since whether the intelligence they provided was adequate warning of the attack on Pearl Harbor — whether warnings were missed, ignored, or simply failed to indicate the specific time and place of attack.`,
    ],
    connections: [
      { label: 'Purple Wiring Explorer', path: '/purple-wiring' },
      { label: 'RED (predecessor)', path: '/red' },
      { label: 'SIGABA (American equivalent)', path: '/sigaba' },
    ],
  },

  'otp': {
    id: 'otp',
    headline: 'The Only Unbreakable Cipher',
    category: 'Perfect Secrecy / Information-Theoretic Security',
    era: '1882 – Present',
    origin: 'International',
    keyFacts: [
      { label: 'Invented by', value: 'Frank Miller, 1882; reinvented by Vernam, 1917' },
      { label: 'Proven secure by', value: 'Claude Shannon, 1949 — "Communication Theory of Secrecy Systems"' },
      { label: 'Security type', value: 'Information-theoretic — secure against unlimited computing power' },
      { label: 'Requirements', value: 'Key must be: truly random, as long as message, never reused' },
      { label: 'Still in use', value: 'Nuclear command & control hotlines, diplomatic channels' },
      { label: 'Famous failure', value: 'KGB "Venona" — reused pads exposed dozens of Soviet agents' },
    ],
    quote: {
      text: 'The one-time pad gives a system which is perfect secrecy — it is impossible, even in principle, to determine the original message.',
      attribution: 'Claude Shannon, Communication Theory of Secrecy Systems, 1949',
    },
    lead: `Every cipher in this museum, given enough ciphertext and enough computing power, can eventually be broken. Every cipher except one. The one-time pad is the only encryption system in history that has been mathematically proven to be unbreakable — not just computationally secure against current technology, but provably, theoretically, permanently secure against any adversary with unlimited time and unlimited computing power. Claude Shannon proved this in 1949. The proof has never been challenged.`,
    body: [
      `The principle is simple to state and brutal to implement. Write out your message. Generate a sequence of truly random characters — not pseudorandom, not algorithmically generated, but genuinely random, drawn from a physical process like radioactive decay or thermal noise. XOR each character of your message with the corresponding random character. Transmit the result. The recipient, who holds an identical copy of the random sequence, reverses the XOR and recovers the message. Then both parties destroy their copy of the key. Never reuse any portion of it.`,
      `Claude Shannon's 1949 proof established why this works. For a ciphertext encrypted with a one-time pad, every possible plaintext of the same length is equally likely to be the original message. Without the key, an attacker looking at the ciphertext gains zero information about the plaintext — not "very little information," but literally zero. The system achieves what Shannon called "perfect secrecy." This is fundamentally different from the computational security of AES or RSA, which are secure only because no efficient algorithm to break them has been found. One-time pad security is unconditional.`,
      `The catch is the key. A one-time pad key must be as long as the message it encrypts, truly random, and used exactly once. These requirements, trivial on paper, are operationally catastrophic at scale. Distributing a key as long as every message you ever intend to send requires a secure channel — but if you had a secure channel for the key, you could use it for the message itself. Military use required couriers carrying suitcases full of pad pages, strict accounting procedures, and destruction protocols. The Moscow–Washington hotline installed in 1963 used one-time pads for its first twelve years, requiring daily shipments of key material by diplomatic courier.`,
      `The most spectacular failure in one-time pad history was the Soviet "Venona" traffic. During the Second World War, under the pressure of producing vast quantities of key material, the KGB's cryptographic centers in the United States reused some pad pages — a catastrophic violation of the only rule that makes the system secure. American cryptanalysts at the Army Signal Security Agency noticed statistical regularities in the traffic that shouldn't exist in a properly implemented one-time pad. Working for decades — from the 1940s into the 1980s — they recovered portions of thousands of messages, identifying dozens of Soviet intelligence assets including Julius and Ethel Rosenberg, Kim Philby, and an agent inside the Manhattan Project codenamed QUANTUM. The messages were never fully decrypted. The key reuse gave just enough: fragments, codenames, patterns. The one-time pad had been beaten not by cryptanalysis but by human failure.`,
    ],
    connections: [
      { label: 'Vigenère (conceptual ancestor)', path: '/vigenere' },
      { label: 'Stream Ciphers (practical alternative)', path: '/chacha20' },
      { label: 'Lorenz SZ42 (XOR-based machine)', path: '/lorenz-sz42' },
      { label: 'LFSR (keystream generation)', path: '/lfsr' },
    ],
  },

};

export default exhibits;
