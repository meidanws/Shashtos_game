export type TeamId = 'team1' | 'team2'

/**
 * setup     – configuring the two teams
 * claiming  – rounds are played offline; the winner of each round claims a cube
 * revealing – the game is over; the wall is opened one cube at a time
 */
export type GamePhase = 'setup' | 'claiming' | 'revealing'

export interface Team {
  id: TeamId
  name: string
  color: string
}

export type Teams = Record<TeamId, Team>

export interface Cube {
  /** Stable position on the wall, 0..11 */
  id: number
  /** Which character sits on the front face */
  characterId: string
  /** Hidden score, generated once when the game is created, shown only at reveal */
  score: number
  /** Team that won this cube, or null while unclaimed */
  claimedBy: TeamId | null
  /** 1-based order in which the cube was claimed, or null */
  pickOrder: number | null
  /** Has this cube been turned over? Only ever true once the game is over. */
  revealed: boolean
}

export interface Move {
  cubeId: number
  teamId: TeamId
}

export interface GameState {
  version: number
  phase: GamePhase
  teams: Teams
  cubes: Cube[]
  /** The team that just won a round and is waiting to pick a cube. */
  pendingTeam: TeamId | null
  moves: Move[]
  soundEnabled: boolean
  /** The looping background theme, switched independently of the effects. */
  musicEnabled: boolean
  createdAt: number
}

export interface TeamSetup {
  name: string
  color: string
}

export interface GameConfig {
  team1: TeamSetup
  team2: TeamSetup
  soundEnabled?: boolean
  musicEnabled?: boolean
}

export type Scores = Record<TeamId, number>

export const TEAM_IDS: readonly TeamId[] = ['team1', 'team2'] as const
