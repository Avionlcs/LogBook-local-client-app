function normalizeKey(key) {
  return String(key)
    .trim()
    .replace(/[\s\-]+/g, "_")                    // spaces & dashes → _
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")   // ABCd → AB_Cd (acronym boundary)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")      // aB → a_B
    .replace(/([0-9])([a-zA-Z])/g, "$1_$2")      // 2a → 2_a
    .replace(/([a-zA-Z])([0-9])/g, "$1_$2")      // a2 → a_2
    .replace(/_+/g, "_")                          // collapse multiple _
    .replace(/^_+|_+$/g, "")                      // trim leading/trailing _
    .toLowerCase();                               // lowercase LAST
}
module.exports = normalizeKey;