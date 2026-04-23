import { Browserbase } from "@browserbasehq/sdk";
import { Stagehand } from "@browserbasehq/stagehand";
import { PlayerSession } from "../types/connect4";
import stagehandConfig from "../stagehand.config";

export class BrowserService {
  private browserbase: Browserbase | null = null;

  constructor() {
    if (process.env.BROWSERBASE_API_KEY && !process.env.BROWSERBASE_API_KEY.includes('YOUR_')) {
      this.browserbase = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
    }
  }

  /**
   * Creates a new player session with Stagehand
   * @returns Promise<PlayerSession> - The created player session
   */
  async createPlayerSession(): Promise<PlayerSession> {
    try {
      console.log("🚀 Creating new Stagehand session...");
      const stagehand = new Stagehand(stagehandConfig);
      await stagehand.init();

      const sessionUrl = stagehand.browserbaseSessionID
        ? `https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`
        : undefined;

      let liveViewLink: string | undefined;

      if (stagehand.browserbaseSessionID) {
        liveViewLink = await this.getLiveViewLink(stagehand.browserbaseSessionID);
      }

      console.log(`✅ Stagehand session created: ${sessionUrl}`);

      return {
        stagehand,
        page: stagehand.page,
        sessionUrl,
        liveViewLink,
        browserbaseSessionID: stagehand.browserbaseSessionID
      };
    } catch (error) {
      console.error(`❌ Error creating player session: ${error}`);
      throw new Error(`Failed to create player session: ${error}`);
    }
  }

  /**
   * Sets up a player by navigating to the Connect 4 site and entering game details
   * @param player - The Playwright page object
   * @param roomName - The room name to join
   * @param playerName - The name of the player
   * @returns Promise<void>
   */
  async setupPlayer(player: { goto: (url: string) => Promise<void>; waitForLoadState: (state: string) => Promise<void>; act: (action: string) => Promise<void>; waitForTimeout: (ms: number) => Promise<void> }, roomName: string, playerName: string): Promise<void> {
    try {
      console.log(`🎯 Setting up ${playerName}...`);
      
      await player.goto("https://buddyboardgames.com/connect4");
      await player.waitForLoadState("domcontentloaded");
      console.log(`🎯 ${playerName} page loaded successfully`);
      
      await player.act(`Enter '${playerName}' into the 'Your name' field`);
      await player.act(`Enter '${roomName}' into the Room name field`);
      await player.act("Click the 'Get Started' button");
      
      console.log(`✅ Game setup completed for ${playerName}`);
      
      await player.waitForTimeout(2000);
      console.log(`✅ ${playerName} setup completed successfully`);
      
    } catch (error) {
      console.warn(`⚠️ Error setting up ${playerName}: ${error}`);
      throw error;
    }
  }

  /**
   * Generates a sanitized live-view URL for a Browserbase session
   * @param sessionId - The Browserbase session ID
   * @returns Promise<string | undefined> - The sanitized live-view URL or undefined if failed
   */
  async getLiveViewLink(sessionId: string | undefined): Promise<string | undefined> {
    try {
      if (!sessionId || !this.browserbase) {
        console.log("⚠️ No sessionId or Browserbase SDK available for live view link");
        return undefined;
      }
      
      console.log(`🔍 Generating live view link for session: ${sessionId}`);
      
      const liveViewLinks = await this.browserbase.sessions.debug(sessionId);
      const hiddenNavbarUrl = `${liveViewLinks.debuggerFullscreenUrl}&navbar=false`;
      
      console.log("✅ Live view link generated successfully:", hiddenNavbarUrl);
      return hiddenNavbarUrl;
      
    } catch (error) {
      console.log(`❌ Failed to generate live view link: ${error}`);
      return undefined;
    }
  }

  /**
   * Closes a player session
   * @param stagehand - The Stagehand instance to close
   * @param playerName - The name of the player for logging
   * @returns Promise<void>
   */
  async closeSession(stagehand: Stagehand, playerName: string): Promise<void> {
    try {
      await stagehand.close();
      console.log(`✅ ${playerName} session closed successfully`);
    } catch (closeError) {
      console.warn(`⚠️ Error closing ${playerName} session: ${closeError}`);
    }
  }

  /**
   * Sets up a complete player session with Stagehand and live-view link
   * @param playerName - Name of the player for logging
   * @returns Promise<PlayerSession> - Object containing all session details
   */
  async setupPlayerSession(playerName: string): Promise<PlayerSession> {
    try {
      console.log(`🚀 Setting up ${playerName} session...`);
      
      const { stagehand, page, sessionUrl, liveViewLink, browserbaseSessionID } = await this.createPlayerSession();
      
      console.log(`✅ ${playerName} session setup completed successfully`);
      
      return {
        stagehand,
        page,
        sessionUrl,
        liveViewLink,
        browserbaseSessionID
      };
      
    } catch (error) {
      console.error(`❌ Failed to setup ${playerName} session:`, error);
      throw error;
    }
  }
}
