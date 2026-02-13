# Requirements Document: Manager UI Completion

## Introduction

This specification defines the requirements for completing the Manager UI for the Codebase Memory MCP Server. The Manager UI is a single-page web application that enables users to manage, search, and inspect their indexed knowledge bases without requiring CLI tools. The UI must work reliably across all browsers, including Safari, which has specific constraints around localhost HTTP connections.

## Glossary

- **Manager_UI**: The single-page web application served by the Fastify server for managing codebases
- **Codebase**: A collection of indexed code files with associated metadata and embeddings
- **Chunk**: A segment of code (function, class, or file) that has been indexed with embeddings
- **Chunk_Set**: A collection of chunks created during a single ingestion operation, identified by timestamp
- **Ingestion**: The process of scanning, parsing, and indexing a codebase directory
- **Embedding**: A vector representation of code used for semantic search
- **Embedded_Data**: All application data and functionality injected into the HTML page at render time
- **Search_Service**: The TypeScript service that performs semantic search across indexed knowledge bases
- **Codebase_Service**: The TypeScript service that manages codebase CRUD operations
- **Client_Side_Bundle**: JavaScript bundle containing all service code that runs entirely in the browser

## Requirements

### Requirement 1: Server-Side Rendering Architecture

**User Story:** As a developer using any browser including Safari, I want the Manager UI to work without client-side HTTP API calls, so that I never encounter Safari's TLS/HSTS errors on localhost.

#### Acceptance Criteria

1. WHEN the Manager UI page is requested, THE Fastify_Server SHALL render HTML with embedded data from services
2. WHEN a user performs an action (search, ingest, rename, delete), THE Manager_UI SHALL submit a form to a Fastify route
3. WHEN a Fastify route receives a form submission, THE route handler SHALL call domain services directly (bypassing HTTP API layer)
4. WHEN a service operation completes, THE Fastify_Server SHALL re-render the HTML page with updated data
5. THE Manager_UI SHALL NOT make fetch() or XMLHttpRequest calls to HTTP API endpoints
6. THE HTTP API endpoints SHALL remain available for MCP server and CLI tools

### Requirement 2: Semantic Search Interface

**User Story:** As a developer, I want to search across all my indexed knowledge bases using natural language queries, so that I can quickly find relevant code snippets.

#### Acceptance Criteria

1. WHEN the search interface is displayed, THE Manager_UI SHALL provide a form with input field for query text
2. WHEN the search interface is displayed, THE Manager_UI SHALL provide a selector for maximum results (default: 10, range: 1-100)
3. WHERE the user wants to filter results, THE Manager_UI SHALL provide optional filters for codebase name and programming language
4. WHEN a search form is submitted, THE Manager_UI SHALL POST to a Fastify route that calls SearchService directly
5. WHEN search results are returned, THE Fastify_Server SHALL render HTML displaying each result with file path, line numbers, content snippet, and similarity score
6. WHEN search results are displayed, THE Manager_UI SHALL format code snippets with syntax highlighting or monospace font
7. WHEN a search is in progress, THE Manager_UI SHALL display a loading indicator (via page refresh or progressive enhancement)
8. IF a search fails, THEN THE Fastify_Server SHALL render an error message with details
9. WHEN search results are displayed, THE Manager_UI SHALL make file paths and content copyable to clipboard

### Requirement 3: Codebase Ingestion Interface

**User Story:** As a developer, I want to ingest new codebases from the UI, so that I don't need to switch to the command line.

#### Acceptance Criteria

1. WHEN the ingestion interface is displayed, THE Manager_UI SHALL provide a form with fields for codebase name and directory path
2. WHEN the codebase name field receives input, THE Manager_UI SHALL validate that the name is non-empty and contains only valid characters
3. WHEN the directory path field receives input, THE Manager_UI SHALL validate that the path is non-empty
4. WHEN the ingestion form is submitted, THE Manager_UI SHALL call Ingestion_Service methods directly to initiate ingestion
5. WHEN ingestion is in progress, THE Manager_UI SHALL display a progress indicator with status updates
6. WHEN ingestion completes successfully, THE Manager_UI SHALL display a success message and refresh the codebase list
7. IF ingestion fails, THEN THE Manager_UI SHALL display an error message with failure details
8. WHEN ingestion completes, THE Manager_UI SHALL clear the form fields for the next ingestion

### Requirement 4: Enhanced Statistics Display

**User Story:** As a developer, I want to view comprehensive statistics for each codebase, so that I can understand what has been indexed.

#### Acceptance Criteria

1. WHEN a codebase is selected, THE Manager_UI SHALL display total chunk count, file count, and last ingestion timestamp
2. WHEN statistics are displayed, THE Manager_UI SHALL show language distribution with chunk counts and file counts per language
3. WHEN statistics are displayed, THE Manager_UI SHALL show chunk type distribution (function, class, file)
4. WHEN statistics are displayed, THE Manager_UI SHALL show the ingestion source path
5. WHEN a codebase has multiple chunk sets, THE Manager_UI SHALL display ingestion history with timestamps
6. WHEN ingestion history is displayed, THE Manager_UI SHALL allow deletion of individual chunk sets
7. WHEN statistics are loading, THE Manager_UI SHALL display a loading indicator
8. IF statistics fail to load, THEN THE Manager_UI SHALL display an error message with retry option

### Requirement 5: Administrative Operations

**User Story:** As a developer, I want to rename and delete codebases from the UI, so that I can maintain my codebase collection.

#### Acceptance Criteria

1. WHEN a codebase is selected, THE Manager_UI SHALL provide a rename button
2. WHEN the rename button is clicked, THE Manager_UI SHALL display a modal with the current name pre-filled
3. WHEN a new name is entered and confirmed, THE Manager_UI SHALL call Codebase_Service methods directly to rename the codebase
4. WHEN rename succeeds, THE Manager_UI SHALL display a success message and refresh the codebase list
5. WHEN a codebase is selected, THE Manager_UI SHALL provide a delete button
6. WHEN the delete button is clicked, THE Manager_UI SHALL display a confirmation modal with warning text
7. WHEN deletion is confirmed, THE Manager_UI SHALL call Codebase_Service methods directly to remove the codebase
8. WHEN deletion succeeds, THE Manager_UI SHALL display a success message and refresh the codebase list
9. IF rename or delete fails, THEN THE Manager_UI SHALL display an error message with details

### Requirement 6: Responsive User Experience

**User Story:** As a developer, I want the UI to provide clear feedback for all operations, so that I understand what is happening.

#### Acceptance Criteria

1. WHEN any asynchronous operation is in progress, THE Manager_UI SHALL display a loading indicator
2. WHEN an operation completes successfully, THE Manager_UI SHALL display a success message for 5 seconds
3. WHEN an operation fails, THE Manager_UI SHALL display an error message with actionable details
4. WHEN the UI is waiting for user input, THE Manager_UI SHALL disable submit buttons to prevent duplicate submissions
5. WHEN forms are submitted, THE Manager_UI SHALL validate inputs before sending requests
6. WHEN validation fails, THE Manager_UI SHALL display inline error messages near the invalid fields
7. WHEN the page loads with no codebases, THE Manager_UI SHALL display an empty state with instructions to use the ingest feature

### Requirement 7: Direct Service Integration

**User Story:** As the Fastify server, I need to call domain services directly from route handlers, so that the Manager UI bypasses the HTTP API layer.

#### Acceptance Criteria

1. THE Fastify_Server SHALL have direct access to CodebaseService, SearchService, and IngestionService instances
2. WHEN a Manager UI route is requested, THE route handler SHALL call service methods directly
3. WHEN service methods return data, THE route handler SHALL render HTML templates with that data
4. THE Fastify_Server SHALL inject service results into HTML as embedded data for immediate display
5. THE Fastify_Server SHALL handle service errors and render error states in the HTML
6. THE HTTP API routes SHALL remain separate and continue to work for MCP server and CLI tools

### Requirement 8: Initial Data Embedding

**User Story:** As the Fastify server, I need to embed initial codebase data in the HTML response, so that the UI can render immediately without waiting for service initialization.

#### Acceptance Criteria

1. WHEN the Manager UI route is requested, THE Fastify_Server SHALL fetch the current list of codebases
2. WHEN codebases are fetched, THE Fastify_Server SHALL include basic metadata (name, chunk count, file count, languages)
3. WHEN the HTML is rendered, THE Fastify_Server SHALL inject codebase data as a JavaScript object in a script tag
4. WHEN the HTML is rendered, THE Fastify_Server SHALL set the window.__INITIAL_DATA__ variable with the embedded data
5. IF fetching codebases fails, THEN THE Fastify_Server SHALL still serve the HTML with an empty data object
6. THE Fastify_Server SHALL ensure embedded data is properly escaped to prevent XSS vulnerabilities

### Requirement 9: Error Handling and User Guidance

**User Story:** As a developer, I want clear error messages when operations fail, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN any service method call fails, THE Manager_UI SHALL catch the error and extract the error message
2. WHEN an error is caught, THE Manager_UI SHALL display a message with the error details
3. WHEN any operation fails, THE Manager_UI SHALL log the error to the browser console for debugging
4. WHEN an error message is displayed, THE Manager_UI SHALL include the error code and message from the service response
5. WHEN a validation error occurs, THE Manager_UI SHALL highlight the invalid fields and show specific validation messages
6. WHEN the UI is in an error state, THE Manager_UI SHALL provide a retry button or clear action to recover

### Requirement 10: UI Layout and Navigation

**User Story:** As a developer, I want a well-organized UI with clear sections, so that I can easily access all features.

#### Acceptance Criteria

1. THE Manager_UI SHALL organize features into distinct sections: Search, Codebases, Details, and Ingest
2. WHEN the page loads, THE Manager_UI SHALL display all sections in a responsive grid layout
3. WHEN the viewport is narrow (mobile), THE Manager_UI SHALL stack sections vertically
4. WHEN the viewport is wide (desktop), THE Manager_UI SHALL display sections in a multi-column layout
5. THE Manager_UI SHALL provide visual hierarchy with headers, cards, and spacing
6. THE Manager_UI SHALL use consistent styling for buttons, forms, and data displays
7. THE Manager_UI SHALL maintain the existing color scheme and design language

### Requirement 11: DayNight Admin Theme Application

**User Story:** As a developer, I want a visually appealing and modern UI theme based on the DayNight Admin template, so that the Manager UI is pleasant to use and professionally presented.

#### Acceptance Criteria

1. THE Manager_UI SHALL use the DayNight Admin color system with CSS variables for Snow (light) and Carbon (dark) editions
2. THE Manager_UI SHALL implement the theme toggle allowing users to switch between Snow and Carbon editions
3. THE Manager_UI SHALL use DM Sans font family as the primary typeface
4. THE Manager_UI SHALL apply consistent spacing using the theme's spacing system (0.5rem increments)
5. THE Manager_UI SHALL use card-based layouts with border-radius: 12px and subtle shadows
6. THE Manager_UI SHALL implement smooth transitions (0.2s ease) for all interactive elements
7. THE Manager_UI SHALL use the theme's button styles (btn-primary, btn-secondary, btn-ghost)
8. THE Manager_UI SHALL apply the theme's form input styles with focus states
9. THE Manager_UI SHALL use monospace fonts for code snippets and file paths
10. THE Manager_UI SHALL implement the theme's badge system for status indicators
11. THE Manager_UI SHALL use the theme's navigation structure with sticky top nav
12. THE Manager_UI SHALL be responsive following the theme's breakpoints (1200px, 992px, 768px)
