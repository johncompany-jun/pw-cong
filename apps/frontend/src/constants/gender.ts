export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
} as const

export const GenderLabel: Record<string, string> = {
  male: '兄弟',
  female: '姉妹',
}
