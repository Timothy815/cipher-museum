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


  'typex': {
    id: 'typex',
    headline: 'Enigma\'s Better Student',
    category: 'Electromechanical Cipher Machine',
    era: '1937 – 1970s',
    origin: 'Britain',
    keyFacts: [
      { label: 'Designed by', value: 'Wing Commander O.G.W. Lywood, RAF, 1934' },
      { label: 'Based on', value: 'Commercial Enigma patents — legally purchased' },
      { label: 'Rotors', value: '5 total: 2 fixed stators + 3 stepping rotors' },
      { label: 'Improvements over Enigma', value: 'Multiple notches per rotor, no reflector limitation' },
      { label: 'Units produced', value: '~5,000 during the war' },
      { label: 'Security status', value: 'Never broken by any adversary' },
    ],
    quote: {
      text: 'The Typex gave us a secure means of communication throughout the war. The enemy never read a single message.',
      attribution: 'Official History of British Signals Intelligence',
    },
    lead: `In the early 1930s, Britain faced a paradox. Its codebreakers at Bletchley Park were beginning to understand exactly how the Enigma worked — and exactly why it was weak. The task fell to a Royal Air Force wing commander to take the German machine's best ideas, fix its worst flaws, and build something the Germans would never be able to return the favor on. The result was Typex: a cipher machine that borrowed Enigma's rotor concept, corrected its structural vulnerabilities, and remained unbroken for the entire war.`,
    body: [
      `The Typex's designers had the unusual advantage of knowing what they were improving. Britain had obtained commercial Enigma machines in the late 1920s — they were briefly available on the open market — and Wing Commander Lywood's team studied them carefully before designing their own system. They understood the Enigma's double-stepping anomaly, which caused the middle rotor to step twice in certain positions, creating a predictable pattern. They understood the reflector's constraint that a letter could never encrypt to itself. They set out to eliminate both.`,
      `The most significant departure was the addition of a second fixed stator rotor and the use of multiple notches on each stepping rotor. In Enigma, each rotor had a single notch that triggered the next rotor's advance — a simple, odometer-like mechanism that Bletchley Park exploited extensively. Typex rotors had multiple notches at different positions, making the stepping pattern irregular and far harder to model mathematically. The two stator rotors at the input end served as a combined plugboard and rotor bank, providing substitution that changed with each message setting rather than remaining fixed as in Enigma's plugboard.`,
      `Approximately 5,000 Typex machines were produced during the war, serving across the RAF, the British Army, and Allied forces. The machine was trusted for the most sensitive communications — Far East operations, D-Day coordination, strategic bombing plans. The Germans, who were working hard to read British traffic, never penetrated it. Post-war analysis of German signals intelligence records found no evidence that Typex traffic was ever read. When German cryptanalysts examined captured Typex machines, they found the irregular stepping mechanism sufficient to defeat the analytical approaches that had worked against Enigma.`,
      `A footnote of considerable irony: Bletchley Park itself used Typex machines, modified, to re-encrypt ULTRA intelligence — the decoded Enigma traffic — before distributing it to commanders in the field. The machine designed to resist German cryptanalysis was used to protect the secret that German cryptanalysis had been defeated. Typex remained in British service into the 1970s before being replaced by electronic systems, giving it a longer operational life than almost any other cipher machine of the war generation.`,
    ],
    connections: [
      { label: 'Enigma I (the inspiration)', path: '/enigma-i' },
      { label: 'Typex Wiring Explorer', path: '/typex-wiring' },
      { label: 'SIGABA (American equivalent)', path: '/sigaba' },
    ],
  },

  'cx52': {
    id: 'cx52',
    headline: 'Operation Rubicon: The Most Audacious Intelligence Operation in History',
    category: 'Pin-Wheel Cipher Machine',
    era: '1952 – 1990s',
    origin: 'Switzerland — Crypto AG (secretly CIA/BND)',
    keyFacts: [
      { label: 'Manufacturer', value: 'Crypto AG, Zug, Switzerland' },
      { label: 'Secret owners', value: 'CIA (US) and BND (West Germany) from 1970' },
      { label: 'Countries compromised', value: 'More than 120 governments' },
      { label: 'Operation codename', value: 'Operation Rubicon (US); Operation Thesaurus (Germany)' },
      { label: 'Duration', value: 'Approximately 1970 – 1993' },
      { label: 'Declassified', value: 'February 2020 — Washington Post / ZDF investigation' },
    ],
    quote: {
      text: 'It was the intelligence coup of the century. Foreign governments were paying good money to the US and West Germany for the privilege of having their communications read.',
      attribution: 'CIA internal history, declassified 2020',
    },
    lead: `For decades, more than 120 governments around the world purchased cipher machines from Crypto AG, a trusted Swiss company with a reputation for neutrality and precision engineering. They believed they were buying unbreakable security. They were buying machines that had been secretly engineered to leak their keys to the CIA. The governments of Iran, Libya, Argentina, India, and Pakistan — among scores of others — encrypted their most sensitive communications on machines whose "randomness" had been mathematically manipulated so that American analysts could read the traffic within hours.`,
    body: [
      `Crypto AG was founded in 1952 by Boris Hagelin, a Swedish-born inventor who had sold his earlier M-209 pin-wheel cipher machine to the US Army in the millions during the Second World War. Hagelin's machines were the gold standard of commercial cryptography. In the late 1960s, the NSA approached Hagelin with a proposition: allow the Americans to influence the design of Crypto AG's machines — subtly weakening the key generation algorithms — and in return, Hagelin would receive financial guarantees and protection. Hagelin, elderly and commercially vulnerable, agreed. After Hagelin's death, the CIA and West Germany's BND formalized the arrangement in 1970 by secretly purchasing the company outright through a series of shell corporations. Crypto AG's employees had no idea.`,
      `The manipulation was technically elegant and brutally effective. The machines produced by Crypto AG were genuine cipher machines — they encrypted using real algorithms, produced real ciphertext, resisted casual analysis. The weakness was buried in the key generation: the algorithms contained subtle biases, reduced effective key lengths, or leaked key information in ways that only the NSA, which designed the vulnerability, could exploit. To anyone without prior knowledge of the backdoor, the machine appeared secure. To the NSA's analysts, the traffic was transparent.`,
      `The intelligence haul was extraordinary. During the 1979–1981 Iran hostage crisis, American analysts read Iranian diplomatic traffic in real time as Tehran discussed the hostages' condition and negotiating positions. When Argentina and Britain fought over the Falkland Islands in 1982, the US read Argentine military communications — and shared some of it with Britain. When Libya was suspected of ordering terrorist attacks in Europe in the 1980s, the Reagan administration cited intercepted Libyan communications as justification for the 1986 bombing of Tripoli. Those communications had been read on Crypto AG machines. The evidence was unimpeachable because the NSA had written the weakness itself.`,
      `The operation began to unravel in 1992 when a Crypto AG salesman named Hans Bühler was arrested in Iran on espionage charges. Iran had grown suspicious that its Crypto AG machines might be compromised. Bühler spent nine months in an Iranian prison before Crypto AG paid his ransom — and then, strikingly, immediately fired him and sued him for the cost of his release. Bühler began talking to journalists. The Swiss authorities investigated. In 1994, Der Spiegel and the Baltimore Sun published investigations strongly suggesting the operation's existence. The CIA and BND continued to deny everything. The full story was not confirmed until a joint investigation by the Washington Post and the German public broadcaster ZDF obtained a classified CIA history of the operation in 2020 and published it. Crypto AG had been dissolved in 2018, two years before the story broke.`,
    ],
    connections: [
      { label: 'M-209 (Hagelin\'s earlier machine)', path: '/m209' },
      { label: 'KL-7 (NATO alternative)', path: '/kl7' },
      { label: 'One-Time Pad (the alternative they avoided)', path: '/otp' },
    ],
  },

  'kl7': {
    id: 'kl7',
    headline: 'Thirty Years of Secrets, Sold for Nothing',
    category: 'Rotor Cipher Machine',
    era: '1952 – 1983',
    origin: 'United States / NATO',
    keyFacts: [
      { label: 'Designation', value: 'KL-7 ADONIS' },
      { label: 'Rotors', value: '8 from a set of 12, non-reciprocal' },
      { label: 'Used by', value: 'All NATO nations for 30 years' },
      { label: 'Compromised by', value: 'John Walker spy ring, from 1967' },
      { label: 'Duration of compromise', value: '~18 years before Walker\'s arrest in 1985' },
      { label: 'Damage assessment', value: 'Described by the FBI as "the most damaging espionage in US history"' },
    ],
    quote: {
      text: 'John Walker did more damage to the United States than any spy in history. The Soviets could read our most sensitive communications for nearly two decades.',
      attribution: 'FBI Director William Webster, 1985',
    },
    lead: `In 1967, US Navy warrant officer John Anthony Walker Jr. walked into the Soviet embassy in Washington, D.C., handed over a classified document, and asked what it was worth. The Soviets paid him. He came back. For the next eighteen years — through the detente of the 1970s, the Cold War tensions of the early 1980s, and the largest peacetime military buildup in American history — Walker sold the Soviets the key lists for the KL-7 cipher machine, NATO's primary encryption system, every month. The Soviets read everything.`,
    body: [
      `The KL-7 was the backbone of NATO communications for three decades. Unlike the Enigma, which used a reflector and was therefore reciprocal — encryption and decryption used the same process — the KL-7 was non-reciprocal, meaning the encryption and decryption processes were mathematically distinct. This made it harder to analyze cryptanalytically. Its eight rotors, selected from a set of twelve, stepped in an irregular pattern driven by notches on the rotor rims. The machine was compact enough for field use, reliable enough for naval operations, and was trusted with the most sensitive NATO traffic.`,
      `Walker's motivation was simple: money and resentment. He was deeply in debt, convinced he was underpaid relative to his responsibilities, and had a grudge against the Navy establishment. The Soviets recognized immediately what they had. Walker had access to the KL-7 key lists — the daily settings that operators loaded into the machine to encrypt and decrypt traffic. With the key lists, the Soviets didn't need to break the KL-7 cryptographically. They simply set their own machines to the same settings and read the traffic directly. Every message transmitted on KL-7 was potentially transparent.`,
      `Walker expanded his operation into a family business. He recruited his brother Arthur, a retired Navy officer who had also worked with KL-7 traffic. He recruited his son Michael, then serving on the aircraft carrier USS Nimitz, who stole classified documents directly from the ship's files. He recruited his friend Jerry Whitworth, a Navy radioman who had direct access to key material. At its peak, the Walker ring was delivering hundreds of classified documents to the Soviets every month. KGB defector Vitaly Yurchenko later told American interrogators that the Walker material had been "the most important intelligence the Soviet Union ever obtained."`,
      `The ring was ultimately betrayed not by cryptanalysis but by Walker's ex-wife Barbara, who called the FBI in 1984 after years of knowing and staying silent. Walker was arrested in a hotel parking lot in Rockville, Maryland in 1985 while dropping off a package of key material. He died in federal prison in 2014. The KL-7 had already been retired in 1983, replaced by more modern systems, but the damage had been done — eighteen years of NATO communications had been accessible to Soviet intelligence. The full extent of what the Soviets learned from Walker's material has never been fully assessed.`,
    ],
    connections: [
      { label: 'KL-7 Wiring Explorer', path: '/kl7-wiring' },
      { label: 'SIGABA (never compromised)', path: '/sigaba' },
      { label: 'CX-52 (another compromised system)', path: '/cx52' },
    ],
  },

  'jefferson': {
    id: 'jefferson',
    headline: 'The Founding Father\'s Cipher, Forgotten for 127 Years',
    category: 'Wheel Cipher / Cylinder Cipher',
    era: '1795 (invented) · 1922 (rediscovered)',
    origin: 'United States',
    keyFacts: [
      { label: 'Invented by', value: 'Thomas Jefferson, c. 1795' },
      { label: 'Rediscovered as', value: 'US Army M-94, 1922 — independently reinvented' },
      { label: 'Wheels', value: '36 wooden disks, each with a scrambled alphabet' },
      { label: 'Used by Jefferson?', value: 'Uncertain — no evidence of field use found' },
      { label: 'Army service', value: 'M-94 used 1922–1942, replaced by M-209' },
      { label: 'Security', value: 'Broken by Bazeries in 1891 (independently)' },
    ],
    quote: {
      text: 'I have been unable to find any trace of this wheel cypher in any of my writings or letters.',
      attribution: 'Thomas Jefferson, in a letter to Robert Patterson, 1802',
    },
    lead: `Sometime around 1795, Thomas Jefferson — then in retirement between his terms as Secretary of State and his election as President — sat down and invented a cipher machine that would not be reinvented for another 127 years. He described it in a manuscript, apparently showed it to no one who recognized its significance, and forgot about it. In 1922, an Army cryptographer named Parker Hitt independently invented the same device. Only then did historians discover Jefferson's original description gathering dust in his papers.`,
    body: [
      `Jefferson's cylinder consisted of 36 wooden disks, each about two inches in diameter, threaded onto an iron spindle. Each disk had the 26 letters of the alphabet inscribed around its edge in a different scrambled order. To encrypt a message, the sender aligned the disks to spell out the plaintext along one row, then chose any other row as the ciphertext. The recipient, with an identical set of disks in the same order, aligned the disks to match the received ciphertext, then looked for the row that spelled intelligible English. The number of possible encipherments was enormous — far beyond any brute-force attack of the era.`,
      `The device's elegance was that it required no paper, no tables, no calculation. Encryption and decryption were mechanical operations that a soldier could perform in the field. The disks could be reordered to change the key — with 36 disks, the number of orderings was 36 factorial, a number with 41 digits. Jefferson saw it as a practical solution to the problems of diplomatic and military secrecy that he had wrestled with as Secretary of State, when he had been responsible for ciphering American dispatches to Europe by hand.`,
      `Whether Jefferson ever actually used his wheel cipher for real correspondence is unknown. His papers contain the design but no examples of encrypted messages and no references to anyone else using it. The invention sat dormant for a century, until the French cryptanalyst Étienne Bazeries independently invented the same concept in 1891, published it, and demonstrated that it could be broken by a known-plaintext attack against the multiple-anagram structure. Then, in 1922, US Army Major Joseph Mauborne and cryptographer Parker Hitt developed the M-94 — a 25-disk cylinder cipher — with no apparent knowledge of either Jefferson or Bazeries. The Army used the M-94 throughout the interwar period before replacing it with the M-209 in 1942.`,
      `When historians finally found Jefferson's 1795 manuscript in the Library of Congress and compared it to the M-94, the similarity was unmistakable. Jefferson had beaten the Army cryptographers by 127 years. The episode illustrates a recurring pattern in cryptographic history: the same idea surfaces independently across decades or centuries, because the underlying problem — how to create a cipher that is both secure and practical — points toward a limited number of elegant solutions. The wheel cipher was simply the right answer for its era, waiting to be found.`,
    ],
    connections: [
      { label: 'Vigenère (contemporary alternative)', path: '/vigenere' },
      { label: 'M-209 (replaced it)', path: '/m209' },
      { label: 'Caesar Cipher (simpler predecessor)', path: '/caesar' },
    ],
  },

  'fialka': {
    id: 'fialka',
    headline: 'The Soviet Answer to Enigma',
    category: 'Electromechanical Rotor Cipher Machine',
    era: '1956 – 1990s',
    origin: 'Soviet Union',
    keyFacts: [
      { label: 'Designation', value: 'M-125 Fialka (Violet)' },
      { label: 'Rotors', value: '10, with alternating orientation (every other rotor reversed)' },
      { label: 'Key loading', value: 'Punch cards — changed daily' },
      { label: 'Character set', value: '30 Cyrillic + 10 digits' },
      { label: 'Distribution', value: 'All Warsaw Pact nations' },
      { label: 'Security status', value: 'Never publicly broken — full analysis only after Cold War' },
    ],
    quote: {
      text: 'The Fialka was a serious machine. The Soviets had studied the Enigma\'s weaknesses carefully and corrected almost all of them.',
      attribution: 'Dr. David Hamer, cryptologic historian',
    },
    lead: `By the early 1950s, the Soviet Union's military cryptographers had access to something the German engineers who built the Enigma never had: a detailed understanding of exactly how the Enigma had been broken. German prisoners, captured documents, and the gradual declassification of wartime intelligence gave Soviet designers a comprehensive list of Enigma's weaknesses. The machine they built to replace their wartime systems — the M-125 Fialka, named for the violet flower — corrected nearly every one of them.`,
    body: [
      `The Fialka's most distinctive feature was the arrangement of its ten rotors. Where the Enigma's rotors all faced the same direction, the Fialka's rotors alternated — every second rotor was inserted in reverse, so the electrical current zigzagged back and forth through the rotor stack rather than traveling consistently in one direction. This eliminated the Enigma's reflector-induced constraint that a letter could never encrypt to itself, the fundamental weakness that underpinned every Bombe attack. In the Fialka, any letter could encrypt to any other letter, including itself.`,
      `The keying system was equally sophisticated. Rather than manually setting a plugboard as Enigma operators did — a process prone to human error and procedural shortcutting — the Fialka loaded its key settings from a punch card inserted into the machine. Each day, new punch cards were distributed to all operators. The card specified not only the rotor starting positions but the complete wiring configuration of the machine's substitution components. Changing the entire key architecture daily with a single card insertion was far more operationally disciplined than the Enigma's multi-step setting procedure.`,
      `The Fialka was distributed not just to Soviet forces but to every Warsaw Pact nation — East Germany, Poland, Czechoslovakia, Hungary, Romania, Bulgaria. This created a significant intelligence problem for NATO: a single compromise of any Warsaw Pact nation's Fialka procedures could expose traffic across the entire alliance. Western intelligence services spent considerable effort trying to obtain Fialka machines and keying material. A small number of machines were eventually obtained through defectors and intelligence operations, but the full technical analysis of the Fialka's cryptographic strength was not published until after the Cold War ended.`,
      `The machine was named Fialka — violet, a small flower — in contrast to the Soviet practice of naming weapons after more aggressive imagery. Whether this reflected irony or simply a naming convention is unknown. The machines were kept under strict security; operators were forbidden to discuss their existence. When the Warsaw Pact dissolved, Fialka machines were recovered from military warehouses across Eastern Europe and gradually found their way into private collections and museums. A working Fialka is among the rarest and most prized artifacts in the history of cryptographic machines.`,
    ],
    connections: [
      { label: 'Fialka Wiring Explorer', path: '/fialka-wiring' },
      { label: 'Enigma I (the machine it improved on)', path: '/enigma-i' },
      { label: 'KL-7 (NATO equivalent)', path: '/kl7' },
      { label: 'VIC Cipher (Soviet hand cipher)', path: '/vic-cipher' },
    ],
  },

  'adfgvx': {
    id: 'adfgvx',
    headline: 'The Cipher That Almost Changed the Outcome of WWI',
    category: 'Fractionation + Transposition Field Cipher',
    era: '1918',
    origin: 'German Empire',
    keyFacts: [
      { label: 'Introduced', value: 'March 5, 1918 — German Spring Offensive' },
      { label: 'Designed by', value: 'Colonel Fritz Nebel, German Army' },
      { label: 'Named for', value: 'The six letters used: A, D, F, G, V, X (chosen for Morse distinctiveness)' },
      { label: 'Broken by', value: 'Lieutenant Georges Painvin, French Army, June 2, 1918' },
      { label: 'Time to break', value: 'Painvin lost 15 pounds during the cryptanalytic effort' },
      { label: 'Consequence of break', value: 'French artillery repositioned; Paris potentially saved' },
    ],
    quote: {
      text: 'I broke the cipher, but the effort almost killed me. I lost fifteen pounds in those weeks.',
      attribution: 'Lieutenant Georges Painvin, French cryptanalyst',
    },
    lead: `In the spring of 1918, Germany launched its final gamble of the First World War — a massive offensive along the Western Front called Operation Michael, designed to break through Allied lines before American troops arrived in force. To coordinate the attack, German signals units began using a new field cipher of unusual complexity. For weeks, Allied cryptanalysts stared at the intercepted messages in complete bafflement. Then, on a single night in early June, a young French lieutenant named Georges Painvin broke it. What he found nearly stopped the French army's heart.`,
    body: [
      `The ADFGVX cipher was the creation of Colonel Fritz Nebel, a German signals officer who designed it specifically to resist the field conditions of the Western Front. Operators using Morse code were prone to errors on letters that sounded similar — E and I, M and N — so Nebel chose only letters whose Morse patterns were maximally distinct from each other: A (·−), D (−··), F (··−·), G (−−·), V (···−), X (−··−). Every message sent in ADFGVX contained only these six letters, giving the intercepts an immediately recognizable character.`,
      `The cipher worked in two stages. First, each letter of the plaintext was looked up in a 6×6 Polybius square — a grid containing all 26 letters and 10 digits, keyed by a keyword — and replaced by the two letters naming its row and column. A message of ten characters became twenty ADFGVX pairs. Then the resulting string was written into a grid whose columns were reordered according to the alphabetical rank of a second keyword, and the message was read off column by column. The combination of fractionation (splitting each character into two) and transposition (reordering the columns) meant that attacks on either component alone were futile — the two had to be broken simultaneously.`,
      `Painvin's break came through a method requiring both mathematical insight and physical endurance. He identified messages sent on the same day with similar lengths — suggesting they might use the same transposition key — and found pairs whose ADFGVX text shared unusual structural similarities. From these relationships he was able to infer column positions, then work backward through the Polybius square substitution. The process required days of continuous work. He later said he could feel his health deteriorating as he pushed through.`,
      `The message Painvin finally decrypted on June 2, 1918, read: "Munition und Verpflegung beschleunigt vorbringen" — "Rush ammunition and supplies." The specificity of the location data in the message told French intelligence exactly where Germany was concentrating its next offensive thrust. French artillery and reserves were repositioned overnight. The German advance in that sector stalled. Whether Painvin's break directly saved Paris — as some histories claim — is debated by scholars, but the strategic value of reading the German supply orders in real time during the war's final offensive was unquestionable. Fritz Nebel's cipher had lasted ninety days.`,
    ],
    connections: [
      { label: 'Polybius Square (the fractionation component)', path: '/polybius' },
      { label: 'Columnar Transposition (the second step)', path: '/columnar' },
      { label: 'Bifid Cipher (similar fractionation)', path: '/bifid' },
      { label: 'Frequency Analysis (the attack tool)', path: '/frequency-analysis' },
    ],
  },

  'vic-cipher': {
    id: 'vic-cipher',
    headline: 'The Most Complex Hand Cipher Ever Used in the Field',
    category: 'Manual Spy Cipher',
    era: 'c. 1950 – 1957',
    origin: 'Soviet Union — KGB',
    keyFacts: [
      { label: 'Used by', value: 'KGB agent Reino Häyhänen (VICTOR), New York, c. 1950–57' },
      { label: 'Discovered', value: 'A hollow nickel found in Brooklyn, 1953' },
      { label: 'Broken by', value: 'NSA — after Häyhänen\'s 1957 defection provided the key' },
      { label: 'Operations', value: 'Straddling checkerboard + chain addition + double columnar transposition' },
      { label: 'Assessment', value: 'Described by NSA as "the most complex hand cipher we have encountered"' },
      { label: 'Exposed', value: 'Soviet spy Rudolf Abel (William Fisher), arrested 1957' },
    ],
    quote: {
      text: 'It was the most complex hand cipher we had ever encountered. Without Häyhänen\'s assistance, I doubt we would have broken it.',
      attribution: 'NSA analyst, quoted in The Spy Who Came In From the Cold War',
    },
    lead: `In 1953, a Brooklyn paperboy named Jimmy Bozart dropped a hollow nickel on the sidewalk. It split open. Inside was a tiny piece of microfilm bearing a grid of numbers. The nickel made its way to the FBI, where it sat unread for four years — the numbers were the output of a cipher so complex that American cryptanalysts couldn't touch it. The break came not from mathematics but from betrayal: a KGB officer who had drunk himself into uselessness walked into the American embassy in Paris in 1957 and offered to explain everything.`,
    body: [
      `The VIC cipher was a three-stage manual encryption system that the KGB developed for its "illegal" agents — officers operating under deep cover in the United States without diplomatic protection. These agents couldn't carry cipher machines; they needed a system that existed entirely in their heads, required only paper and pencil, and would yield nothing even if the materials were discovered. The VIC cipher met all three requirements with extraordinary sophistication.`,
      `The first stage was a straddling checkerboard — a substitution table that assigned single digits to the most common letters of the language (those letters that needed no "straddling") and two-digit pairs to the rest. The checkerboard was keyed by a phrase and by a song title that the agent memorized. This step converted the plaintext into a string of digits of irregular length — longer for rare letters, shorter for common ones — which itself defeated frequency analysis of the digit string.`,
      `The second stage expanded the resulting digit string using "chain addition" — a technique where each pair of adjacent digits was added without carrying to produce new digits, extending a short key into a long numerical sequence. This was repeated multiple times, producing a keystream that appeared random but was entirely reproducible by anyone who knew the original key phrase and song title. The third stage performed a double columnar transposition on the digit string, using two different keyword-derived orderings. The result was a number sequence with no discernible pattern, generated entirely by a person with a pencil and a good memory.`,
      `Reino Häyhänen, the agent who carried the hollow nickel, was a drunk and a failure who had accomplished almost nothing useful for the KGB during his years in New York. When he defected in 1957, he told the NSA how the VIC cipher worked and provided enough key material to break the messages they had been holding. The decrypted traffic led directly to Rudolf Abel — real name William Fisher — the KGB's most senior illegal officer in the United States, living in Brooklyn as an artist and photography teacher. Abel was arrested, convicted, and sentenced to 30 years. In 1962, he was traded for U-2 pilot Francis Gary Powers at the Glienicke Bridge in Berlin. The hollow nickel that started it all is now in the FBI's museum in Washington.`,
    ],
    connections: [
      { label: 'Polybius Square (ancestor of checkerboard)', path: '/polybius' },
      { label: 'Columnar Transposition (third stage)', path: '/columnar' },
      { label: 'One-Time Pad (what it approximated)', path: '/otp' },
      { label: 'Fialka (Soviet machine cipher)', path: '/fialka' },
    ],
  },

  'diffie-hellman': {
    id: 'diffie-hellman',
    headline: 'The Impossible Problem That Wasn\'t',
    category: 'Public Key Exchange Protocol',
    era: '1976 – Present',
    origin: 'United States',
    keyFacts: [
      { label: 'Published by', value: 'Whitfield Diffie & Martin Hellman, November 1976' },
      { label: 'Paper title', value: '"New Directions in Cryptography"' },
      { label: 'Security basis', value: 'Discrete logarithm problem — computationally intractable' },
      { label: 'Prior classified work', value: 'GCHQ (Malcolm Williamson, 1974) — classified until 1997' },
      { label: 'Turing Award', value: '2015 — "the Oscar of computer science"' },
      { label: 'Used today', value: 'TLS, SSH, IPsec, Signal — foundational to internet security' },
    ],
    quote: {
      text: 'We stand today on the brink of a revolution in cryptography.',
      attribution: 'Whitfield Diffie & Martin Hellman, "New Directions in Cryptography," 1976',
    },
    lead: `For the entire history of cryptography up to 1976, secure communication required a secure channel to exchange keys first. If you wanted to send an encrypted message to someone, you had to already share a secret with them — which meant meeting in person, trusting a courier, or using another secure channel. This seemed like an unbreakable logical constraint. Then two mathematicians at Stanford published a three-page paper and made it irrelevant. Whitfield Diffie and Martin Hellman had found a way for two strangers, communicating entirely in public, to establish a shared secret that no eavesdropper could determine.`,
    body: [
      `The insight was mathematical but its implications were immediately practical. Diffie had been obsessing over the key distribution problem for years, convinced there had to be a solution. Hellman, his collaborator and thesis advisor, was skeptical but engaged. The breakthrough came from the properties of modular exponentiation — raising numbers to powers within a finite mathematical space. Computing g^a mod p, given g, a, and p, is easy. Reversing it — computing a from g^a mod p — is believed to be computationally infeasible for large primes p. This asymmetry between easy and hard directions was the mathematical lever they needed.`,
      `The protocol is elegant: Alice and Bob agree publicly on a large prime p and a generator g. Alice chooses a secret number a and sends Bob g^a mod p. Bob chooses a secret number b and sends Alice g^b mod p. Alice computes (g^b)^a mod p. Bob computes (g^a)^b mod p. Since modular exponentiation is distributive, both arrive at the same value: g^(ab) mod p. An eavesdropper who intercepted both public transmissions would see g^a and g^b but would need to compute g^(ab) from them — a problem believed to require solving the discrete logarithm, for which no efficient algorithm exists.`,
      `What Diffie and Hellman published in 1976 was not quite a complete encryption system — it was a key exchange protocol that let two parties establish a shared secret, which they could then use as a key for a symmetric cipher. The concept of public key cryptography — where one key encrypts and a different key decrypts — was outlined in their paper as a theoretical possibility but not fully realized. That came two years later, with RSA. But the 1976 paper was the door. It contained a sentence that reoriented the entire field: "We propose that it may be possible to design a system where encipherment requires knowledge of a public key and decipherment requires knowledge of a different, private key."`,
      `The sting in the story is that Diffie and Hellman were not first. A British mathematician at GCHQ named Malcolm Williamson had independently developed the same key exchange concept in January 1974 — two years earlier — and submitted it as a classified internal paper. GCHQ recognized its significance and immediately classified it. Williamson's priority was not acknowledged publicly until 1997, when GCHQ partially declassified the history. James Ellis at GCHQ had conceived the broader idea of public key cryptography even earlier, in 1970. The Americans got the credit because they could publish. The British, bound by the Official Secrets Act, could only watch.`,
    ],
    connections: [
      { label: 'RSA (built on the same ideas)', path: '/rsa' },
      { label: 'Elliptic Curve Cryptography', path: '/ecc' },
      { label: 'ElGamal (Diffie-Hellman variant)', path: '/elgamal' },
    ],
  },

  'rsa': {
    id: 'rsa',
    headline: 'The Algorithm That Secured the Internet',
    category: 'Public Key Cryptosystem',
    era: '1977 – Present',
    origin: 'United States (MIT)',
    keyFacts: [
      { label: 'Invented by', value: 'Rivest, Shamir & Adleman, MIT, April 1977' },
      { label: 'Prior classified invention', value: 'Clifford Cocks, GCHQ, 1973 — classified until 1997' },
      { label: 'Security basis', value: 'Integer factorization — believed computationally intractable' },
      { label: 'NSA response', value: 'Attempted to classify and suppress — failed' },
      { label: 'Patent', value: 'US Patent 4,405,829 — expired 2000, now public domain' },
      { label: 'Used today', value: 'HTTPS, SSH, code signing, email, digital certificates' },
    ],
    quote: {
      text: 'If you think cryptography can solve your security problem, then you don\'t understand cryptography and you don\'t understand your problem.',
      attribution: 'Ron Rivest',
    },
    lead: `In April 1977, three MIT mathematicians — Ron Rivest, Adi Shamir, and Leonard Adleman — published a paper describing a cryptographic system unlike anything that had existed before. It had a public key and a private key. Anyone could encrypt a message using the public key; only the holder of the private key could decrypt it. The security rested on a simple fact: multiplying two large prime numbers together is easy, but factoring the result back into its two prime components is — for large enough numbers — computationally infeasible. A 25-year-old British mathematician at GCHQ had invented the same thing four years earlier. He couldn't tell anyone.`,
    body: [
      `Ron Rivest described the invention's origin with characteristic wit: he had spent the evening of April 3, 1977, at a Passover seder, come home unable to sleep, and by morning had the algorithm written out. He woke Adi Shamir and Leonard Adleman at dawn to check his work. They didn't find a flaw. Rivest submitted the paper to Martin Gardner, who ran a mathematical games column in Scientific American, and Gardner published it in August 1977. Response was immediate and enormous — Gardner received over 3,000 requests for the technical report.`,
      `The mathematics are elegant. To generate a key pair: choose two large primes p and q. Compute n = p × q (the modulus). Choose e, a public exponent coprime to (p−1)(q−1). Compute d, the modular inverse of e, as the private exponent. The public key is (n, e); the private key is d. To encrypt: c = m^e mod n. To decrypt: m = c^d mod n. The security rests entirely on the difficulty of factoring n back into p and q — and from that, computing d. For a 2048-bit modulus, this is believed to require more computation than humanity could perform before the sun burns out, using classical computers.`,
      `The NSA's reaction to RSA was swift and alarmed. The agency attempted to persuade MIT not to publish, arguing that public key cryptography would compromise national security by giving adversaries encryption that the NSA couldn't break. The attempt failed — Rivest, Shamir, and Adleman were academics, not government employees, and the First Amendment protected their right to publish mathematical results. The episode marked the beginning of the "crypto wars," a decades-long conflict between governments that wanted to control cryptography and mathematicians and technologists who believed encryption was a fundamental right.`,
      `The British mathematician Clifford Cocks at GCHQ had invented the same algorithm independently in November 1973 — three and a half years before RSA. His supervisor James Ellis had conceived the broader idea of public key cryptography in 1970. Ellis and Cocks' work was classified Top Secret and remained so until 1997. Cocks worked in obscurity, unable to claim credit for one of the most significant mathematical discoveries of the twentieth century, while Rivest, Shamir, and Adleman received patents, prizes, and the Turing Award. Cocks was awarded a CBE by the British government in 2008, a recognition that arrived thirty-five years late.`,
    ],
    connections: [
      { label: 'Diffie-Hellman (the paper that inspired it)', path: '/diffie-hellman' },
      { label: 'Digital Signatures (RSA in practice)', path: '/digital-signature' },
      { label: 'Elliptic Curve Cryptography (modern alternative)', path: '/ecc' },
      { label: 'ElGamal', path: '/elgamal' },
    ],
  },

  'playfair': {
    id: 'playfair',
    headline: 'Named After the Man Who Didn\'t Invent It',
    category: 'Digraph Substitution Cipher',
    era: '1854 – 1945',
    origin: 'Britain',
    keyFacts: [
      { label: 'Invented by', value: 'Charles Wheatstone, 1854' },
      { label: 'Named after', value: 'Lyon Playfair — promoted it to the British government' },
      { label: 'Encrypts', value: 'Letter pairs (digraphs) — the first practical digraph cipher' },
      { label: 'Used in', value: 'Boer War, WWI (Britain), WWII (Australia, Britain)' },
      { label: 'Famous use', value: 'John F. Kennedy\'s PT-109 rescue message, 1943' },
      { label: 'Security status', value: 'Broken by frequency analysis of digraphs' },
    ],
    quote: {
      text: 'The cipher is so simple that a boy of twelve could learn it in fifteen minutes.',
      attribution: 'Lyon Playfair, advocating for its adoption, 1854',
    },
    lead: `In 1854, the British scientist Charles Wheatstone — inventor of the Wheatstone bridge and co-inventor of the telegraph — devised a cipher that encrypted pairs of letters rather than single letters, making frequency analysis dramatically harder. He demonstrated it at a dinner party. The other guests were intrigued. His friend Lyon Playfair, a prominent Scottish chemist and politician, championed it energetically before the British government, tried to get it adopted, and lobbied for years on its behalf. History remembered the wrong man. To this day, the cipher bears Playfair's name.`,
    body: [
      `The Playfair cipher operates on a 5×5 grid containing the 25 letters of the alphabet (I and J share a cell). The grid is keyed by writing a keyword into the first cells, then filling the rest with the remaining letters in order. To encrypt, the plaintext is divided into letter pairs. If both letters of a pair appear in the same row of the grid, each is replaced by the letter to its right (wrapping around). If both appear in the same column, each is replaced by the letter below it. Otherwise, each letter is replaced by the letter in its own row but in the column of the other letter — forming a rectangle in the grid.`,
      `The cipher's strength over simple substitution is real. Where a simple substitution cipher leaves the frequency distribution of individual letters intact, the Playfair cipher scrambles it at the digraph level. The 676 possible letter pairs (26 × 26) have a much flatter frequency distribution than the 26 individual letters, making the standard frequency attack less effective. The cipher requires a significantly larger ciphertext to break — typically several hundred characters rather than the dozens sufficient to attack a Caesar cipher.`,
      `The British government's initial reaction to Playfair was lukewarm — a Foreign Office official reportedly found it too complicated. It was eventually adopted and used throughout the Boer War (1899–1902) and into the First World War, by which point cryptanalysis had advanced enough that trained analysts could break it in a few hours given sufficient ciphertext. The Australians continued using it in the Second World War for lower-level field communications, reasoning that even if a message was eventually broken, the information would be stale enough to be harmless.`,
      `The cipher's most memorable wartime use came in August 1943 in the Solomon Islands. When PT-109, commanded by Lieutenant John F. Kennedy, was rammed and sunk by a Japanese destroyer, the survivors were stranded on a tiny island. A native islander named Biuku Gasa agreed to carry a message to the nearest Australian coast watcher. Kennedy, with no paper, carved his message into a coconut shell. The message was enciphered in Playfair. It was received, decoded, and the survivors were rescued. The coconut shell later sat on Kennedy's desk in the Oval Office. Kennedy had Wheatstone's cipher to thank for his rescue — and Lyon Playfair's name on the solution.`,
    ],
    connections: [
      { label: 'Polybius Square (the grid concept)', path: '/polybius' },
      { label: 'Bifid Cipher (also uses a Polybius grid)', path: '/bifid' },
      { label: 'Frequency Analysis (the attack)', path: '/frequency-analysis' },
      { label: 'Hill Cipher (matrix generalization)', path: '/hill' },
    ],
  },

};

export default exhibits;

