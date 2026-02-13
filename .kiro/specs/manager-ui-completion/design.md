# Design Document: Manager UI Completion

## Overview

This design completes the Manager UI for the Codebase Memory MCP Server by adding search functionality, ingestion interface, and admin operations using a server-side rendering (SSR) architecture. The Manager UI is a traditional web application served by Fastify that renders HTML with embedded data and handles user interactions through form submissions.

The critical architectural decision is to bypass the HTTP API layer for the Manager UI only. Instead of the UI making fetch() calls to localhost endpoints (which causes Safari TLS/HSTS issues), user interactions trigger form submissions to Fastify routes that call domain services directly. The HTTP API layer remains available for MCP server and CLI tools.

### Key Design Decisions

1. **Server-Side Rendering (SSR)**: Fastify renders HTML with embedded data, no client-side API calls
2. **Form-Based Interactions**: User actions trigger form submissions to Fastify routes
3. **Direct Service Calls**: Fastify routes call domain services directly (bypassing HTTP API layer)
4. **Progressive Enhancement**: JavaScript enhances UX but is not required for core functionality
5. **DayNight Admin Theme**: Modern, professional theme with Snow (light) and Carbon (dark) editions
6. **HTTP API Preserved**: API layer remains for MCP server and CLI tools

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Manager UI (Server-Rendered HTML)             │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Search    │  │  Codebases   │  │   Ingest    │  │  │
│  │  │    Form     │  │     List     │  │    Form     │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │  ┌─────────────┐  ┌──────────────┐                   │  │
│  │  │   Details   │  │    Admin     │                   │  │
│  │  │    View     │  │  Operations  │                   │  │
│  │  └─────────────┘  └──────────────┘                   │  │
│  │                                                        │  │
│  │  Embedded Data (rendered at page load)                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    Form Submissions (POST/GET)
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Fastify Server                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Manager UI Routes (SSR)                   │  │
│  │  • GET  /manager (render HTML with data)              │  │
│  │  • POST /manager/search (search & re-render)          │  │
│  │  • POST /manager/ingest (ingest & redirect)           │  │
│  │  • POST /manager/rename (rename & redirect)           │  │
│  │  • POST /manager/delete (delete & redirect)           │  │
│  │  • GET  /manager/codebase/:name (view details)        │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         HTTP API Routes (for MCP/CLI)                  │  │
│  │  • GET  /api/knowledgebases                                 │  │
│  │  • POST /api/search                                    │  │
│  │  • GET  /api/knowledgebases/:name/stats                     │  │
│  │  • PUT  /api/knowledgebases/:name                           │  │
│  │  • DELETE /api/knowledgebases/:name                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    Direct Service Calls
                            │
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Codebase   │  │    Search    │  │  Ingestion   │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Initial Page Load**:
1. Browser requests GET /manager
2. Fastify calls CodebaseService.listCodebases()
3. Fastify renders HTML template with embedded codebase data
4. Browser receives complete HTML with all data
5. No client-side API calls needed

**Search Operation**:
1. User enters query and submits form
2. Browser sends POST /manager/search
3. Fastify route calls SearchService.search() directly
4. Fastify renders HTML with search results embedded
5. Browser displays updated page with results

**Ingestion Operation**:
1. User enters codebase name and directory, submits form
2. Browser sends POST /manager/ingest
3. Fastify route calls IngestionService.ingest() directly
4. Fastify shows progress page (or redirects on completion)
5. Browser displays success page with updated codebase list

**Admin Operations (Rename/Delete)**:
1. User clicks rename/delete button, submits form
2. Browser sends POST /manager/rename or POST /manager/delete
3. Fastify route calls CodebaseService methods directly
4. Fastify redirects to /manager with success message
5. Browser displays updated codebase list

## Components and Interfaces

### 1. Manager UI HTML Template

**Location**: `src/ui/manager/index.html` (or use a template engine like EJS/Handlebars)

**Responsibilities**:
- Render all UI sections (search, codebases, details, ingest, admin)
- Display server-provided data (codebases, search results, stats)
- Provide forms for user interactions
- Apply DayNight Admin theme styling
- Support theme toggle (Snow/Carbon editions)

**Template Structure**:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codebase Memory Manager</title>
    <script>
        // Prevent flash in dark mode
        if (localStorage.getItem('codebase-theme') === 'carbon') {
            document.documentElement.classList.add('carbon');
        }
    </script>
    <link rel="stylesheet" href="/static/manager.css">
</head>
<body>
    <!-- Top Navigation -->
    <nav class="top-nav">
        <div class="nav-container">
            <div class="nav-left">
                <a href="/manager" class="logo">
                    <div class="logo-icon">🔍</div>
                    Codebase Memory
                </a>
            </div>
            <div class="nav-right">
                <div class="theme-toggle">
                    <button class="theme-btn theme-btn-snow active" onclick="setTheme('snow')">☀️</button>
                    <button class="theme-btn theme-btn-carbon" onclick="setTheme('carbon')">🌙</button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
        <!-- Page Header -->
        <div class="page-header">
            <h1 class="greeting">Codebase Memory Manager</h1>
            <p class="greeting-sub">Manage your indexed knowledge bases</p>
        </div>

        <!-- Alert Messages -->
        {{#if message}}
        <div class="alert {{messageType}}">{{message}}</div>
        {{/if}}

        <!-- Two Column Layout -->
        <div class="two-col">
            <!-- Codebases List -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Codebases</h3>
                </div>
                {{#if codebases.length}}
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Chunks</th>
                            <th>Files</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each codebases}}
                        <tr>
                            <td><a href="/manager/codebase/{{name}}">{{name}}</a></td>
                            <td><span class="badge badge-blue">{{chunkCount}}</span></td>
                            <td><span class="badge badge-green">{{fileCount}}</span></td>
                            <td>
                                <form method="POST" action="/manager/delete" style="display:inline;">
                                    <input type="hidden" name="name" value="{{name}}">
                                    <button type="submit" class="btn btn-ghost" onclick="return confirm('Delete {{name}}?')">Delete</button>
                                </form>
                            </td>
                        </tr>
                        {{/each}}
                    </tbody>
                </table>
                {{else}}
                <div class="empty-state">
                    <p>No codebases found. Use the ingest form to add one.</p>
                </div>
                {{/if}}
            </div>

            <!-- Search Form -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Search</h3>
                </div>
                <form method="POST" action="/manager/search">
                    <div class="form-group">
                        <label class="form-label">Query</label>
                        <input type="text" name="query" class="form-input" placeholder="Search across all knowledge bases..." required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Max Results</label>
                        <select name="maxResults" class="form-input">
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Search</button>
                </form>

                {{#if searchResults}}
                <div style="margin-top: 1.5rem;">
                    <h4>Results ({{searchResults.length}})</h4>
                    {{#each searchResults}}
                    <div class="search-result">
                        <div class="result-header">
                            <code>{{filePath}}</code>
                            <span class="badge badge-blue">{{similarity}}%</span>
                        </div>
                        <pre><code>{{content}}</code></pre>
                    </div>
                    {{/each}}
                </div>
                {{/if}}
            </div>
        </div>

        <!-- Ingest Form -->
        <div class="card" style="margin-top: 1.5rem;">
            <div class="card-header">
                <h3 class="card-title">Ingest New Codebase</h3>
            </div>
            <form method="POST" action="/manager/ingest">
                <div class="form-group">
                    <label class="form-label">Codebase Name</label>
                    <input type="text" name="name" class="form-input" placeholder="my-project" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Directory Path</label>
                    <input type="text" name="path" class="form-input" placeholder="/path/to/codebase" required>
                </div>
                <button type="submit" class="btn btn-primary">Start Ingestion</button>
            </form>
        </div>
    </main>

    <script src="/static/manager.js"></script>
</body>
</html>
```

### 2. Fastify Manager Routes

**Location**: `src/infrastructure/fastify/manager-routes.ts`

**Responsibilities**:
- Serve HTML pages with embedded data
- Handle form submissions
- Call domain services directly
- Manage redirects and flash messages

**Route Implementations**:

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CodebaseService } from '../../domains/codebase/codebase.service';
import { SearchService } from '../../domains/search/search.service';
import { IngestionService } from '../../domains/ingestion/ingestion.service';

export async function registerManagerRoutes(
  fastify: FastifyInstance,
  codebaseService: CodebaseService,
  searchService: SearchService,
  ingestionService: IngestionService
) {
  // Serve static assets
  fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../../ui/manager/static'),
    prefix: '/static/'
  });

  // Main page - list codebases
  fastify.get('/manager', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const codebases = await codebaseService.listCodebases();
      
      return reply.view('manager.html', {
        codebases,
        message: request.flash('message'),
        messageType: request.flash('messageType')
      });
    } catch (error) {
      logger.error('Failed to load codebases', error);
      return reply.view('manager.html', {
        codebases: [],
        message: 'Failed to load codebases',
        messageType: 'error'
      });
    }
  });

  // View codebase details
  fastify.get('/manager/codebase/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string };
    
    try {
      const stats = await codebaseService.getStats(name);
      const codebases = await codebaseService.listCodebases();
      
      return reply.view('manager.html', {
        codebases,
        selectedCodebase: name,
        stats
      });
    } catch (error) {
      request.flash('message', `Failed to load codebase: ${error.message}`);
      request.flash('messageType', 'error');
      return reply.redirect('/manager');
    }
  });

  // Search
  fastify.post('/manager/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const { query, maxResults = 10 } = request.body as { query: string; maxResults?: number };
    
    try {
      const results = await searchService.search({
        query,
        maxResults: Number(maxResults)
      });
      
      const codebases = await codebaseService.listCodebases();
      
      return reply.view('manager.html', {
        codebases,
        searchResults: results,
        searchQuery: query
      });
    } catch (error) {
      request.flash('message', `Search failed: ${error.message}`);
      request.flash('messageType', 'error');
      return reply.redirect('/manager');
    }
  });

  // Ingest
  fastify.post('/manager/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, path: codebasePath } = request.body as { name: string; path: string };
    
    try {
      await ingestionService.ingest({ name, path: codebasePath });
      
      request.flash('message', `Successfully ingested ${name}`);
      request.flash('messageType', 'success');
      return reply.redirect('/manager');
    } catch (error) {
      request.flash('message', `Ingestion failed: ${error.message}`);
      request.flash('messageType', 'error');
      return reply.redirect('/manager');
    }
  });

  // Rename
  fastify.post('/manager/rename', async (request: FastifyRequest, reply: FastifyReply) => {
    const { oldName, newName } = request.body as { oldName: string; newName: string };
    
    try {
      await codebaseService.rename(oldName, newName);
      
      request.flash('message', `Renamed ${oldName} to ${newName}`);
      request.flash('messageType', 'success');
      return reply.redirect('/manager');
    } catch (error) {
      request.flash('message', `Rename failed: ${error.message}`);
      request.flash('messageType', 'error');
      return reply.redirect('/manager');
    }
  });

  // Delete
  fastify.post('/manager/delete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.body as { name: string };
    
    try {
      await codebaseService.delete(name);
      
      request.flash('message', `Deleted ${name}`);
      request.flash('messageType', 'success');
      return reply.redirect('/manager');
    } catch (error) {
      request.flash('message', `Delete failed: ${error.message}`);
      request.flash('messageType', 'error');
      return reply.redirect('/manager');
    }
  });
}
```

### 3. Template Engine Setup

**Recommended**: Use Handlebars or EJS for server-side templating

**Installation**:
```bash
npm install @fastify/view handlebars
```

**Configuration**:
```typescript
import view from '@fastify/view';
import handlebars from 'handlebars';

fastify.register(view, {
  engine: {
    handlebars
  },
  root: path.join(__dirname, '../../ui/manager/templates'),
  layout: 'layout.html',
  options: {
    partials: {
      header: 'partials/header.html',
      footer: 'partials/footer.html'
    }
  }
});
```

### 4. Flash Messages

**Installation**:
```bash
npm install @fastify/flash @fastify/session
```

**Configuration**:
```typescript
import session from '@fastify/session';
import flash from '@fastify/flash';

fastify.register(session, {
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  cookie: { secure: false } // set to true in production with HTTPS
});

fastify.register(flash);
```

### 5. Search Results Display

**Responsibilities**:
- Display search results in server-rendered HTML
- Show file path, line numbers, content snippet, similarity score
- Format code snippets with monospace font
- Handle empty results gracefully

**Template Section**:

```handlebars
{{#if searchResults}}
<div class="search-results">
    <h4>Search Results ({{searchResults.length}})</h4>
    {{#each searchResults}}
    <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <code style="font-size: 0.875rem;">{{filePath}}</code>
            <span class="badge badge-blue">{{similarity}}% match</span>
        </div>
        <div style="margin-bottom: 0.5rem;">
            <span class="badge badge-green">{{language}}</span>
            <span class="badge badge-orange">{{chunkType}}</span>
            <span style="font-size: 0.8125rem; color: var(--text-secondary);">
                Lines {{startLine}}-{{endLine}}
            </span>
        </div>
        <pre style="background: var(--bg-surface); padding: 1rem; border-radius: 8px; overflow-x: auto;"><code>{{content}}</code></pre>
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard(this, '{{content}}')">
            Copy
        </button>
    </div>
    {{/each}}
</div>
{{else}}
{{#if searchQuery}}
<div class="empty-state">
    <p>No results found for "{{searchQuery}}"</p>
</div>
{{/if}}
{{/if}}
```

### 6. Client-Side JavaScript (Progressive Enhancement)

**Location**: `src/ui/manager/static/manager.js`

**Responsibilities**:
- Theme toggle functionality
- Copy to clipboard
- Form validation (optional enhancement)
- Confirmation dialogs

**Implementation**:

```javascript
// Theme toggle
function setTheme(theme) {
    if (theme === 'carbon') {
        document.documentElement.classList.add('carbon');
        document.body.classList.add('carbon');
    } else {
        document.documentElement.classList.remove('carbon');
        document.body.classList.remove('carbon');
    }
    localStorage.setItem('codebase-theme', theme);
    
    // Update button states
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.theme-btn-${theme}`).classList.add('active');
}

// Copy to clipboard
function copyToClipboard(button, text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('btn-success');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('btn-success');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
}

// Auto-dismiss alerts
document.addEventListener('DOMContentLoaded', () => {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
});
```

## Data Models

### Codebase List Item

```typescript
interface CodebaseListItem {
  name: string;
  chunkCount: number;
  fileCount: number;
  languages: string[];
  lastIngestion: string; // ISO timestamp
}
```

### Codebase Stats

```typescript
interface CodebaseStats {
  name: string;
  chunkCount: number;
  fileCount: number;
  lastIngestion: string;
  languages: Array<{
    language: string;
    chunkCount: number;
    fileCount: number;
  }>;
  chunkTypes: Array<{
    type: string;
    count: number;
  }>;
}
```

### Search Result

```typescript
interface SearchResult {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
  chunkType: string;
  similarity: number;
  codebaseName: string;
}
```

### Form Data

**Search Form**:
```typescript
interface SearchFormData {
  query: string;
  maxResults?: number;
  codebaseName?: string;
  language?: string;
}
```

**Ingest Form**:
```typescript
interface IngestFormData {
  name: string;
  path: string;
}
```

**Rename Form**:
```typescript
interface RenameFormData {
  oldName: string;
  newName: string;
}
```

**Delete Form**:
```typescript
interface DeleteFormData {
  name: string;
}
```

## Theme and Visual Design

### DayNight Admin Theme

The Manager UI uses the DayNight Admin template theme system with two editions:

**Snow Edition (Light Mode)**:
- Background: `#FFFFFF` (primary), `#F8FAFC` (secondary), `#F1F5F9` (surface)
- Text: `#1E293B` (primary), `#64748B` (secondary)
- Accent: `#38BDF8` (sky blue)
- Borders: `#E2E8F0`

**Carbon Edition (Dark Mode)**:
- Background: `#0F0F0F` (primary), `#171717` (secondary), `#1F1F1F` (surface)
- Text: `#F5F5F5` (primary), `#A3A3A3` (secondary)
- Accent: `#38BDF8` (sky blue)
- Borders: `#2E2E2E`

### CSS Variables

```css
:root {
    --bg-primary: #FFFFFF;
    --bg-secondary: #F8FAFC;
    --bg-surface: #F1F5F9;
    --border-color: #E2E8F0;
    --text-primary: #1E293B;
    --text-secondary: #64748B;
    --accent: #38BDF8;
    --accent-hover: #0EA5E9;
    --accent-light: rgba(56, 189, 248, 0.1);
    --success: #22C55E;
    --warning: #F59E0B;
    --danger: #EF4444;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.05);
    --transition: all 0.2s ease;
}

html.carbon,
body.carbon {
    --bg-primary: #0F0F0F;
    --bg-secondary: #171717;
    --bg-surface: #1F1F1F;
    --border-color: #2E2E2E;
    --text-primary: #F5F5F5;
    --text-secondary: #A3A3A3;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
}
```

### Typography

**Font Family**: `'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif`

**Font Sizes**:
- Headers: `1.75rem` (h1), `1rem` (h3)
- Body: `0.9375rem` (default)
- Small: `0.8125rem` (labels), `0.75rem` (badges)

**Font Weights**:
- Regular: `400`
- Medium: `500`
- Semibold: `600`
- Bold: `700`

### Component Styles

**Cards**:
```css
.card {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    transition: var(--transition);
}

.card:hover {
    box-shadow: var(--shadow-md);
}
```

**Buttons**:
```css
.btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 8px;
    transition: var(--transition);
}

.btn-primary {
    background: var(--accent);
    color: white;
}

.btn-primary:hover {
    background: var(--accent-hover);
}
```

**Form Inputs**:
```css
.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    transition: var(--transition);
}

.form-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
}
```

**Badges**:
```css
.badge {
    display: inline-flex;
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 6px;
}

.badge-blue {
    background: var(--accent-light);
    color: var(--accent);
}
```

### Navigation

**Top Nav**:
```css
.top-nav {
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 100;
}

.nav-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
}
```

### Theme Toggle

```javascript
function setTheme(theme) {
    if (theme === 'carbon') {
        document.documentElement.classList.add('carbon');
        document.body.classList.add('carbon');
    } else {
        document.documentElement.classList.remove('carbon');
        document.body.classList.remove('carbon');
    }
    localStorage.setItem('codebase-theme', theme);
    
    // Update button states
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.theme-btn-${theme}`).classList.add('active');
}
```

### Responsive Breakpoints

- Desktop: `>= 1200px` (two-column layout)
- Tablet: `992px - 1199px` (single column, hide nav menu)
- Mobile: `<= 768px` (single column, stack stats)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Embedded Data Injection

*For any* request to the Manager UI route, the HTML response should contain a script tag that sets `window.__INITIAL_DATA__` with properly escaped JSON data.

**Validates: Requirements 8.1, 8.3, 8.4, 8.6**

### Property 2: Safari-Compatible Initial Load

*For any* page load where `window.__INITIAL_DATA__` is defined, the UI should render the codebase list without making fetch() calls to the API.

**Validates: Requirements 1.2**

### Property 3: Fetch Fallback

*For any* page load where `window.__INITIAL_DATA__` is undefined, the UI should make a fetch() call to load codebases from the API.

**Validates: Requirements 1.3**

### Property 4: Search Request Format

*For any* valid search query submission, the UI should send a POST request to `/api/search` with query, maxResults, and optional filter parameters.

**Validates: Requirements 2.4**

### Property 5: Search Result Display Completeness

*For any* search result returned from the API, the rendered result should display file path, line numbers, content snippet, and similarity score.

**Validates: Requirements 2.5**

### Property 6: Code Snippet Formatting

*For any* code snippet displayed in search results, the content should be wrapped in a `<pre><code>` element with monospace font styling.

**Validates: Requirements 2.6, 11.7**

### Property 7: Loading Indicators

*For any* asynchronous operation (search, ingest, load stats), the UI should display a loading indicator while the operation is in progress.

**Validates: Requirements 2.7, 3.5, 4.7, 6.1**

### Property 8: Error Message Display

*For any* failed API operation, the UI should display an error message containing details from the error response.

**Validates: Requirements 2.8, 3.7, 4.8, 5.9, 6.3, 9.4**

### Property 9: Input Validation Before Submission

*For any* form submission (search, ingest, rename), the UI should validate all required fields are non-empty before making the API request.

**Validates: Requirements 3.2, 3.3, 6.5**

### Property 10: Ingestion Progress Streaming

*For any* ingestion operation, the server should stream progress events via Server-Sent Events with phase, current, and total values.

**Validates: Requirements 7.4**

### Property 11: Success Message Auto-Dismiss

*For any* successful operation, the success message should be displayed and automatically dismissed after 5 seconds.

**Validates: Requirements 6.2**

### Property 12: Form Reset After Completion

*For any* completed ingestion operation (success or failure), the form fields should be cleared for the next operation.

**Validates: Requirements 3.8**

### Property 13: Statistics Display Completeness

*For any* selected codebase, the details view should display chunk count, file count, last ingestion timestamp, language distribution, and chunk type distribution.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 14: Admin Operation Confirmation

*For any* destructive operation (delete codebase, delete chunk set), the UI should display a confirmation modal before sending the DELETE request.

**Validates: Requirements 5.6**

### Property 15: XSS Prevention in Embedded Data

*For any* embedded data injection, special characters (`<`, `>`) should be escaped as Unicode escape sequences to prevent XSS attacks.

**Validates: Requirements 8.6**

### Property 16: Button Disable During Operations

*For any* form submission, the submit button should be disabled while the operation is in progress to prevent duplicate submissions.

**Validates: Requirements 6.4**

### Property 17: Error Logging

*For any* API call failure, the error should be logged to the browser console with full details for debugging.

**Validates: Requirements 9.3**

### Property 18: Retry Capability

*For any* failed operation that displays an error, the UI should provide a retry button or action to attempt the operation again.

**Validates: Requirements 4.8, 9.6**

### Property 19: Codebase List Refresh After Mutations

*For any* successful mutation operation (ingest, rename, delete), the codebase list should be refreshed to reflect the changes.

**Validates: Requirements 3.6, 5.4, 5.8**

### Property 20: Clipboard Copy Functionality

*For any* search result displayed, the UI should provide a copy button that copies the content to the clipboard.

**Validates: Requirements 2.9**



## Error Handling

### Server-Side Error Handling

**Route Error Handling**:
- Catch all errors in route handlers
- Use flash messages to communicate errors to users
- Redirect to appropriate pages with error context
- Log errors server-side for debugging

**Validation Errors**:
- Validate form inputs in route handlers
- Return user-friendly error messages
- Preserve form data when possible
- Highlight invalid fields

**Service Errors**:
- Catch service exceptions in routes
- Map technical errors to user-friendly messages
- Log full error details server-side
- Provide actionable error messages

**Example Error Handling**:

```typescript
fastify.post('/manager/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, path } = request.body as { name: string; path: string };
  
  // Validation
  if (!name || !path) {
    request.flash('message', 'Codebase name and path are required');
    request.flash('messageType', 'error');
    return reply.redirect('/manager');
  }
  
  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    request.flash('message', 'Codebase name can only contain letters, numbers, hyphens, and underscores');
    request.flash('messageType', 'error');
    return reply.redirect('/manager');
  }
  
  try {
    await ingestionService.ingest({ name, path });
    request.flash('message', `Successfully ingested ${name}`);
    request.flash('messageType', 'success');
    return reply.redirect('/manager');
  } catch (error) {
    logger.error('Ingestion failed', { name, path, error });
    
    const message = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';
    
    request.flash('message', `Ingestion failed: ${message}`);
    request.flash('messageType', 'error');
    return reply.redirect('/manager');
  }
});
```

### Client-Side Error Handling

**Form Validation (Progressive Enhancement)**:
```javascript
// Optional client-side validation
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });
        
        if (!isValid) {
            e.preventDefault();
            alert('Please fill in all required fields');
        }
    });
});
```

### Error Recovery

**Automatic Recovery**:
- Flash messages auto-dismiss after 5 seconds
- Form data preserved on validation errors
- Redirect to safe pages after errors
- Clear error state on successful operations

**User Actions**:
- Retry buttons on error pages
- Back navigation to previous page
- Clear form buttons
- Help text for common errors

## Testing Strategy

### Dual Testing Approach

The Manager UI completion feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Test specific UI interactions (button clicks, form submissions)
- Test modal open/close behavior
- Test empty state rendering
- Test specific error scenarios (Safari TLS, validation errors)
- Test SSE connection handling
- Test clipboard copy functionality

**Property-Based Tests**: Verify universal properties across all inputs
- Test that all search queries generate valid API requests
- Test that all search results render with required fields
- Test that all forms validate inputs correctly
- Test that all async operations show loading indicators
- Test that all errors display error messages
- Test that all embedded data is properly escaped

### Property Test Configuration

All property-based tests should:
- Run minimum 100 iterations per test
- Use `fast-check` library for property generation
- Reference design document properties in test comments
- Tag format: `Feature: manager-ui-completion, Property {number}: {property_text}`

### Test Coverage Requirements

- Minimum 80% code coverage for all JavaScript code
- 100% coverage for security-critical code (XSS prevention, input validation)
- All API endpoints tested with success and error cases
- All UI components tested with various states (loading, success, error, empty)

### Testing Tools

**Frontend Testing**:
- Vitest for unit tests
- fast-check for property-based tests
- jsdom for DOM testing
- Mock fetch API for testing API calls

**Backend Testing**:
- Vitest for unit tests
- Supertest for HTTP endpoint testing
- Mock services for testing route handlers

### Test Organization

```
src/
  ui/
    manager/
      __tests__/
        index.test.ts              # Unit tests for UI interactions
        index.properties.test.ts   # Property-based tests
  infrastructure/
    fastify/
      __tests__/
        routes.test.ts             # Unit tests for API routes
        routes.properties.test.ts  # Property-based tests
```

### Key Test Scenarios

**Safari Compatibility**:
- Test that embedded data is used when available
- Test fallback to fetch() when embedded data is missing
- Test error handling for fetch() failures

**Search Functionality**:
- Test search form submission with various inputs
- Test search result rendering with various result sets
- Test empty search results
- Test search errors

**Ingestion**:
- Test ingestion form validation
- Test SSE connection and progress updates
- Test ingestion success and error handling
- Test form reset after completion

**Admin Operations**:
- Test rename modal flow
- Test delete confirmation flow
- Test chunk set deletion
- Test error handling for failed operations

**Theme and Styling**:
- Test that code snippets use monospace fonts
- Test that color contrast meets accessibility standards
- Test responsive layout behavior (manual/visual testing)

### Manual Testing Checklist

Since some requirements are visual and not easily automated:
- [ ] Verify theme colors are applied consistently
- [ ] Verify smooth transitions on hover
- [ ] Verify responsive layout on mobile and desktop
- [ ] Verify visual hierarchy and spacing
- [ ] Verify accessibility with keyboard navigation
- [ ] Test in Safari to verify TLS error handling
- [ ] Test in Chrome/Firefox for baseline functionality
- [ ] Verify loading indicators appear during operations
- [ ] Verify success/error messages are clearly visible
- [ ] Verify modals are centered and styled correctly
