#!/usr/bin/env python3
"""
MCP Server Functionality Integration
Provides MCP-like capabilities directly in the Flask app
"""

import sqlite3
import os
import json
from datetime import datetime
from pathlib import Path

class DatabaseMCP:
    """SQLite Database MCP - Query investigation database"""

    def __init__(self, db_path='database.db'):
        self.db_path = db_path

    def query(self, sql_query, params=None):
        """Execute SQL query and return results"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        try:
            if params:
                c.execute(sql_query, params)
            else:
                c.execute(sql_query)

            results = [dict(row) for row in c.fetchall()]
            conn.close()
            return {"success": True, "data": results, "count": len(results)}
        except Exception as e:
            conn.close()
            return {"success": False, "error": str(e)}

    def get_entities(self, entity_type=None, limit=100):
        """Get entities from database"""
        if entity_type:
            query = "SELECT * FROM entities WHERE type = ? LIMIT ?"
            return self.query(query, (entity_type, limit))
        else:
            query = "SELECT * FROM entities LIMIT ?"
            return self.query(query, (limit,))

    def get_documents(self, search_term=None, limit=100):
        """Get documents, optionally filtered by search term"""
        if search_term:
            query = "SELECT * FROM documents WHERE content LIKE ? LIMIT ?"
            return self.query(query, (f'%{search_term}%', limit))
        else:
            query = "SELECT * FROM documents LIMIT ?"
            return self.query(query, (limit,))

    def get_entity_relationships(self, entity_name):
        """Get all relationships for an entity"""
        query = """
            SELECT e1.name as entity1, e1.type as type1,
                   e2.name as entity2, e2.type as type2,
                   em1.document_id, d.filename
            FROM entity_mentions em1
            JOIN entity_mentions em2 ON em1.document_id = em2.document_id
            JOIN entities e1 ON em1.entity_id = e1.id
            JOIN entities e2 ON em2.entity_id = e2.id
            JOIN documents d ON em1.document_id = d.id
            WHERE e1.name = ? AND e1.id != e2.id
            GROUP BY e1.name, e2.name
        """
        return self.query(query, (entity_name,))

    def get_timeline(self, entity_name=None):
        """Get timeline of events, optionally filtered by entity"""
        if entity_name:
            query = """
                SELECT e.date, e.name, e.type, d.filename, em.context
                FROM entities e
                JOIN entity_mentions em ON e.id = em.entity_id
                JOIN documents d ON em.document_id = d.id
                WHERE e.type = 'DATE' AND em.context LIKE ?
                ORDER BY e.name
            """
            return self.query(query, (f'%{entity_name}%',))
        else:
            query = """
                SELECT e.date, e.name, e.type, COUNT(em.id) as mention_count
                FROM entities e
                LEFT JOIN entity_mentions em ON e.id = em.entity_id
                WHERE e.type = 'DATE'
                GROUP BY e.name
                ORDER BY e.name
            """
            return self.query()

class MemoryMCP:
    """Memory MCP - Persistent memory across sessions"""

    def __init__(self, memory_file='mcp_memory.json'):
        self.memory_file = memory_file
        self.memory = self.load_memory()

    def load_memory(self):
        """Load memory from file"""
        if os.path.exists(self.memory_file):
            try:
                with open(self.memory_file, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def save_memory(self):
        """Save memory to file"""
        with open(self.memory_file, 'w') as f:
            json.dump(self.memory, f, indent=2)

    def remember(self, key, value):
        """Store a memory"""
        self.memory[key] = {
            "value": value,
            "timestamp": datetime.now().isoformat()
        }
        self.save_memory()
        return {"success": True, "key": key}

    def recall(self, key):
        """Retrieve a memory"""
        if key in self.memory:
            return {"success": True, "data": self.memory[key]}
        return {"success": False, "error": "Memory not found"}

    def list_memories(self):
        """List all memories"""
        return {"success": True, "data": self.memory}

    def forget(self, key):
        """Delete a memory"""
        if key in self.memory:
            del self.memory[key]
            self.save_memory()
            return {"success": True}
        return {"success": False, "error": "Memory not found"}

class FilesystemMCP:
    """Filesystem MCP - Secure file access"""

    def __init__(self, allowed_paths=None):
        if allowed_paths is None:
            allowed_paths = [
                '/Users/jonathon/Auto1111/Claude',
                '/Users/jonathon/Downloads/IMAGES001'
            ]
        self.allowed_paths = [Path(p) for p in allowed_paths]

    def is_allowed(self, file_path):
        """Check if file path is within allowed directories"""
        file_path = Path(file_path).resolve()
        for allowed_path in self.allowed_paths:
            try:
                file_path.relative_to(allowed_path)
                return True
            except ValueError:
                continue
        return False

    def read_file(self, file_path):
        """Read a file if within allowed paths"""
        if not self.is_allowed(file_path):
            return {"success": False, "error": "Access denied: path not allowed"}

        try:
            with open(file_path, 'r') as f:
                content = f.read()
            return {
                "success": True,
                "path": str(file_path),
                "content": content,
                "size": len(content)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_files(self, directory, pattern='*'):
        """List files in a directory"""
        if not self.is_allowed(directory):
            return {"success": False, "error": "Access denied: path not allowed"}

        try:
            dir_path = Path(directory)
            files = [str(f) for f in dir_path.glob(pattern)]
            return {
                "success": True,
                "directory": str(directory),
                "files": files,
                "count": len(files)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_file_info(self, file_path):
        """Get file metadata"""
        if not self.is_allowed(file_path):
            return {"success": False, "error": "Access denied: path not allowed"}

        try:
            path = Path(file_path)
            stat = path.stat()
            return {
                "success": True,
                "path": str(file_path),
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "is_file": path.is_file(),
                "is_dir": path.is_dir()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

class BraveSearchMCP:
    """Brave Search MCP - Web search for entity verification"""

    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get('BRAVE_API_KEY')

    def search(self, query, count=10):
        """Search the web using Brave Search API"""
        if not self.api_key:
            return {
                "success": False,
                "error": "Brave API key not configured",
                "instructions": "Get free API key at https://brave.com/search/api/"
            }

        try:
            import requests

            url = "https://api.search.brave.com/res/v1/web/search"
            headers = {
                "Accept": "application/json",
                "X-Subscription-Token": self.api_key
            }
            params = {
                "q": query,
                "count": count
            }

            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()

            data = response.json()

            results = []
            if 'web' in data and 'results' in data['web']:
                for r in data['web']['results']:
                    results.append({
                        "title": r.get('title'),
                        "url": r.get('url'),
                        "description": r.get('description')
                    })

            return {
                "success": True,
                "query": query,
                "results": results,
                "count": len(results)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

# Global instances
db_mcp = DatabaseMCP()
memory_mcp = MemoryMCP()
filesystem_mcp = FilesystemMCP()
brave_mcp = BraveSearchMCP()

# Convenience functions
def query_database(sql):
    """Quick database query"""
    return db_mcp.query(sql)

def get_entities(entity_type=None, limit=100):
    """Get entities from database"""
    return db_mcp.get_entities(entity_type, limit)

def get_entity_connections(entity_name):
    """Get entity relationships"""
    return db_mcp.get_entity_relationships(entity_name)

def remember(key, value):
    """Store in memory"""
    return memory_mcp.remember(key, value)

def recall(key):
    """Retrieve from memory"""
    return memory_mcp.recall(key)

def read_file(path):
    """Read a file"""
    return filesystem_mcp.read_file(path)

def search_web(query, count=10):
    """Search the web"""
    return brave_mcp.search(query, count)

if __name__ == '__main__':
    # Test the MCP integrations
    print("="*70)
    print("MCP INTEGRATIONS TEST")
    print("="*70)

    # Test Database MCP
    print("\n1. Testing Database MCP...")
    result = get_entities('PERSON', 5)
    if result['success']:
        print(f"   ✅ Found {result['count']} person entities")
        for entity in result['data'][:3]:
            print(f"      - {entity['name']}")

    # Test Memory MCP
    print("\n2. Testing Memory MCP...")
    memory_mcp.remember('investigation_focus', 'DOJ-OGR documents')
    recall_result = recall('investigation_focus')
    if recall_result['success']:
        print(f"   ✅ Memory stored and recalled: {recall_result['data']['value']}")

    # Test Filesystem MCP
    print("\n3. Testing Filesystem MCP...")
    files_result = filesystem_mcp.list_files('/Users/jonathon/Auto1111/Claude', '*.py')
    if files_result['success']:
        print(f"   ✅ Found {files_result['count']} Python files")

    # Test Brave Search MCP
    print("\n4. Testing Brave Search MCP...")
    search_result = search_web("Epstein investigation DOJ", 3)
    if search_result['success']:
        print(f"   ✅ Search successful, {search_result['count']} results")
    else:
        print(f"   ⏸️  {search_result['error']}")

    print("\n" + "="*70)
    print("MCP INTEGRATIONS READY")
    print("="*70)
