/**
 * Bitbucket API Adapter
 * Provides unified interface for Bitbucket Cloud and Server
 */

const axios = require('axios');
const config = require('./config');

class BitbucketAdapter {
  constructor() {
    this.baseUrl = config.bitbucket.baseUrl;
    this.workspace = config.bitbucket.workspace;
    this.repoSlug = config.bitbucket.repoSlug;
    this.auth = {
      username: config.bitbucket.username,
      password: config.bitbucket.appPassword
    };
    
    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: this.auth,
      timeout: 30000
    });
  }

  /**
   * Get pull request details
   */
  async getPullRequest(prId) {
    try {
      const url = `/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prId}`;
      const response = await this.client.get(url);
      return this.normalizePR(response.data);
    } catch (error) {
      console.error('Error getting PR:', error.message);
      throw error;
    }
  }

  /**
   * Get pull request diff
   */
  async getPullRequestDiff(prId) {
    try {
      const url = `/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prId}/diff`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting diff:', error.message);
      throw error;
    }
  }

  /**
   * Get changed files in PR
   */
  async getChangedFiles(prId) {
    try {
      const url = `/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prId}/diffstat`;
      const response = await this.client.get(url);
      return response.data.values.map(file => ({
        filename: file.new?.path || file.old?.path,
        status: file.status,
        additions: file.lines_added,
        deletions: file.lines_removed,
        changes: file.lines_added + file.lines_removed
      }));
    } catch (error) {
      console.error('Error getting changed files:', error.message);
      throw error;
    }
  }

  /**
   * Add comment to pull request
   */
  async addComment(prId, content) {
    try {
      const url = `/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prId}/comments`;
      const response = await this.client.post(url, {
        content: { raw: content }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error.message);
      throw error;
    }
  }

  /**
   * Get PR approvals
   */
  async getApprovals(prId) {
    try {
      const pr = await this.getPullRequest(prId);
      const approvals = pr.participants.filter(p => p.approved);
      return approvals.length > 0;
    } catch (error) {
      console.error('Error checking approvals:', error.message);
      return false;
    }
  }

  /**
   * Update pull request
   */
  async updatePullRequest(prId, data) {
    try {
      const url = `/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${prId}`;
      const response = await this.client.put(url, data);
      return response.data;
    } catch (error) {
      console.error('Error updating PR:', error.message);
      throw error;
    }
  }

  /**
   * Normalize Bitbucket PR to common format
   */
  normalizePR(bbPR) {
    return {
      number: bbPR.id,
      title: bbPR.title,
      body: bbPR.description,
      user: {
        login: bbPR.author.username
      },
      head: {
        ref: bbPR.source.branch.name,
        sha: bbPR.source.commit.hash
      },
      base: {
        ref: bbPR.destination.branch.name,
        sha: bbPR.destination.commit.hash
      },
      state: bbPR.state,
      mergeable: bbPR.state !== 'MERGED',
      additions: 0,  // Need to calculate from diffstat
      deletions: 0,  // Need to calculate from diffstat
      changed_files: 0  // Need to calculate from diffstat
    };
  }

  /**
   * Get file content
   */
  async getFileContent(filePath, ref) {
    try {
      const url = `/repositories/${this.workspace}/${this.repoSlug}/src/${ref}/${filePath}`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting file content:', error.message);
      throw error;
    }
  }

  /**
   * Update file content
   */
  async updateFileContent(filePath, content, message, branch) {
    try {
      // Bitbucket uses form data for file updates
      const formData = new FormData();
      formData.append('message', message);
      formData.append('branch', branch);
      formData.append(filePath, content);

      const url = `/repositories/${this.workspace}/${this.repoSlug}/src`;
      const response = await this.client.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating file:', error.message);
      throw error;
    }
  }
}

module.exports = BitbucketAdapter;


