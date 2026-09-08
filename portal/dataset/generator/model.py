"""Real MCU shape, counterfactual values. Character names are real; every
fact attached to them (survival, screentime, billing, box office) is
fabricated by this module for the Earth-4471 variant timeline."""
import random

FACTIONS = ["Avengers", "X-Men", "Cosmic", "Villains", "Other"]

REAL_CHARACTER_NAMES = [
    "Tony Stark", "Steve Rogers", "Natasha Romanoff", "Thor Odinson", "Bruce Banner",
    "Clint Barton", "Wanda Maximoff", "Vision", "Sam Wilson", "Bucky Barnes",
    "Peter Parker", "Stephen Strange", "T'Challa", "Shuri", "Carol Danvers",
    "Scott Lang", "Hope van Dyne", "Peter Quill", "Gamora", "Drax",
    "Rocket", "Groot", "Mantis", "Nebula", "Loki",
    "Wanda's Children", "Kate Bishop", "Yelena Belova", "America Chavez", "Riri Williams",
    "Charles Xavier", "Jean Grey", "Scott Summers", "Ororo Munroe", "Logan",
    "Kurt Wagner", "Kitty Pryde", "Bobby Drake", "Warren Worthington", "Piotr Rasputin",
    "Victor von Doom", "Thanos", "Ultron", "Killmonger", "Hela",
    "Kang", "Mysterio", "Vulture", "Red Skull", "Ronan",
    "Nick Fury", "Maria Hill", "Everett Ross", "Happy Hogan", "Pepper Potts",
    "Wong", "Valkyrie", "Korg", "Okoye", "M'Baku",
]

def build_rng(seed):
    return random.Random(seed)
