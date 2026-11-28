/** The line read as one: the name and the role word, skipping the name when there is none. */
export const senderLabel = (name: string, word: string) => [name, word].filter(Boolean).join(' · ');
