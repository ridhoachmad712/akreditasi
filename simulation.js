// Internal projection based on IAU DL-09 (27 November 2025), sections 2.3-2.4.
// The caller must verify completeness and approval before setting ready=true.
export function projectUnggul({ ready, passed, requiredPassed, eligibilityPassed, qualificationPassed, publicationPassed }) {
  if (!ready) return 'Belum dapat disimpulkan';
  const core = requiredPassed === 8 && eligibilityPassed && qualificationPassed;
  if (core && passed >= 52 && publicationPassed) return 'Simulasi: Unggul 5 tahun';
  if (core && passed >= 40) return 'Simulasi: Unggul 2 tahun';
  return 'Simulasi: belum memenuhi Unggul';
}
