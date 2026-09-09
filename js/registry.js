const module = [];

export function registriere(modul) {
  if (!modul || !modul.id) throw new Error('Modul braucht eine id');
  if (module.some((m) => m.id === modul.id)) {
    throw new Error(`Modul "${modul.id}" ist bereits registriert`);
  }
  module.push(modul);
}

export function alleModule() {
  return [...module];
}

export function holeModul(id) {
  return module.find((m) => m.id === id);
}

export function leereRegistry() {
  module.length = 0;
}
