# Content rating (IARC questionnaire)

Category to pick: **Reference, News, or Educational**. Email for the IARC certificate: the academy's
support address (from `academy_contact` on production; never in git).

| Question | Answer | Why |
|---|---|---|
| Violence, blood, gore | No | Quran lessons, schedules and reports only |
| Sexual content, nudity | No | — |
| Profanity or crude humour | No | — |
| Controlled substances (drugs, alcohol, tobacco) | No | — |
| Gambling, simulated gambling | No | — |
| Fear / horror | No | — |
| **Users can interact or exchange content** | **Yes** | Chat with the teacher (photos, voice, PDF) and live audio/video lessons in the academy's classroom. Both are limited to the student's own teacher and the academy's staff; no public profiles, no strangers |
| Shares the user's current location with other users | No | No location permission or API |
| Allows digital purchases | No | No in-app purchases; payment links (Stripe) are sent by staff outside the app |
| Unrestricted internet access (a browser) | No | The app opens only its own links (legal pages, lesson links, report files) in the system browser |
| Is the app a web browser or search engine | No | — |

Expected result: **Everyone / PEGI 3 / USK 0**, with the interactive element «Users Interact».

The questionnaire must be re-answered when chat or the in-app classroom are switched on if the first
submission was made with them off (the answers above already assume they can be on).
