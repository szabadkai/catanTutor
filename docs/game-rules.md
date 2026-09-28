# Local teaching ruleset 0.1

HexTutor uses an original visual identity and the generic vocabulary of resource strategy games. It is not an official version of any commercial game.

## Island and resources

The default island contains 19 hexes: four timber, three clay, four wool, four grain, three ore and one barren tile. Eighteen shuffled production tokens use the multiset `2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12`. The warden begins on the barren tile. Adjacent 6/8 tokens are allowed. The bank begins with 19 cards of each resource.

The engine calls timber `wood` and clay `brick`; presentation labels are centralized in `shared`.

## Setup

Three or four players place a settlement, then an adjacent road, in forward order. Repeat in reverse order. Settlements cannot share an intersection or be adjacent: at least one empty intersection must separate buildings. Setup placements are free and need no prior road connection. The second settlement collects one resource from every adjacent productive tile, if available. The first player starts turn one after everyone has two settlements and two roads.

## Turns and production

Roll two six-sided dice exactly once. For totals other than seven, matching unblocked tiles pay one card per settlement and two per city to all adjacent players. If a resource has insufficient bank stock to pay all matching buildings, that resource pays nobody on that roll. Other resources distribute normally. All resources are conserved between players and bank.

On seven, a hand larger than seven automatically discards half its cards, rounded down. This prototype selects individual cards using the seeded RNG. The active player moves the warden to a different tile. Production on that tile stops until it moves. One random card is taken from an adjacent opponent with cards; absent an explicit victim command, choose the eligible opponent with the most points, breaking ties by player ID. This automation is visible in the guide and event log.

During the main phase a player may build and trade repeatedly, then end the turn. All hands are visible in this local practice ruleset.

## Construction

| Build      | Cost                                 | Result                                                   | Maximum pieces |
| ---------- | ------------------------------------ | -------------------------------------------------------- | -------------- |
| Road       | 1 timber + 1 clay                    | Occupies an empty edge attached to your road or building | 15             |
| Settlement | 1 timber + 1 clay + 1 wool + 1 grain | Occupies a legal intersection adjoining your road        | 5              |
| City       | 2 grain + 3 ore                      | Replaces your settlement; doubles production             | 4              |

An opponent's building interrupts road extension through that vertex. A city returns a settlement piece to the available supply. Connections and spacing are engine rules, including for clicks made through developer tools.

## Trade

The bank exchanges four identical resources for one different resource when stock permits. Owning either endpoint of a general port improves the rate to 3:1. Owning either endpoint of a specialized port permits its resource at 2:1. The best applicable rate wins.

Only the active player initiates an offer. Choose one counterpart, offered resource/count and requested resource/count. Both counts must be positive integers and affordable. Only the addressed player can accept or reject. Acceptance rechecks both hands atomically; costs may have changed since the offer. One offer is pending at a time, and ending the turn cancels it. Bots evaluate offers but do not initiate them in 0.1.

## Network and victory

Each settlement is one point; each city is two. The longest road network is the longest edge-simple trail: roads cannot be counted twice; vertices may be revisited in loops. An opponent's building stops traversal through it. A trail of at least five edges may claim two bonus points. On a tie the existing holder keeps the bonus if still tied for longest; otherwise nobody holds it until a unique leader emerges.

Victory is checked for the active player after every successful action, including the transition to a new active turn. The first active player to reach ten points wins. The finished state accepts no further commands.

## Configuration and omissions

The rules object supports costs, supply, thresholds, piece caps, trade rates and board bags. Resource identities and six-sided dice are fixed for this first slice. Development cards, largest-army scoring, hidden hands, and online play are not implemented. Debug shortcuts that would break command replay are deferred.
