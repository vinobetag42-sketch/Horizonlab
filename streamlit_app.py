import streamlit as st
import streamlit.components.v1 as components
import os
import subprocess
import shutil

# Page Config
st.set_page_config(layout="wide", page_title="Horizon Lab - AI Suite")

def load_react_app():
    # Paths
    app_dir = os.path.dirname(os.path.abspath(__file__))
    # Changed to dist_app to ensure we don't use stale artifacts from previous builds
    dist_dir = os.path.join(app_dir, "dist_app")
    index_path = os.path.join(dist_dir, "index.html")
    
    # 1. Build Process (Only if needed)
    if not os.path.exists(index_path):
        
        # Check for Node.js
        if shutil.which("npm") is None:
            st.error("❌ Node.js/npm not found. Please add 'nodejs' and 'npm' to packages.txt for Streamlit Cloud.")
            st.stop()

        status = st.status("🚀 Building Application...", expanded=True)
        try:
            status.write("📦 Installing dependencies...")
            # Use ci if package-lock exists for faster/cleaner install, else install
            if os.path.exists(os.path.join(app_dir, "package-lock.json")):
                 subprocess.run(["npm", "ci"], cwd=app_dir, check=True, capture_output=True)
            else:
                 subprocess.run(["npm", "install"], cwd=app_dir, check=True, capture_output=True)
            
            status.write("🔨 Compiling React app...")
            subprocess.run(["npm", "run", "build"], cwd=app_dir, check=True, capture_output=True)
            
            status.update(label="✅ Build Complete!", state="complete", expanded=False)
            st.rerun()
            
        except subprocess.CalledProcessError as e:
            status.update(label="❌ Build Failed", state="error")
            st.error("Build process failed. Check logs.")
            with st.expander("Error Logs"):
                st.code(e.stderr.decode('utf-8') if e.stderr else str(e))
            st.stop()

    # 2. Read HTML
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            html_content = f.read()
    except Exception as e:
        st.error(f"❌ Could not read build file: {e}")
        st.stop()

    # 3. Secure API Key Injection
    api_key = st.secrets.get("API_KEY", os.environ.get("API_KEY", ""))

    if not api_key:
        st.error("⚠️ API_KEY is missing! Please add it to .streamlit/secrets.toml")
        st.stop()

    js_injection = f"""
    <script>
      window.process = window.process || {{}};
      window.process.env = window.process.env || {{}};
      window.process.env.API_KEY = "{api_key}";
    </script>
    """
    
    if "<head>" in html_content:
        html_content = html_content.replace("<head>", f"<head>{js_injection}")
    else:
        html_content = js_injection + html_content

    # 4. Render
    components.html(html_content, height=900, scrolling=True)

if __name__ == "__main__":
    load_react_app()
