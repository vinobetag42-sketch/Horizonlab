import streamlit as st
import streamlit.components.v1 as components
import os
import subprocess
import shutil

st.set_page_config(layout="wide", page_title="Horizon Lab")

def load_react_app():
    # Paths
    app_dir = os.path.dirname(__file__)
    dist_dir = os.path.join(app_dir, "dist")
    index_path = os.path.join(dist_dir, "index.html")
    
    # Check if build exists
    if not os.path.exists(index_path):
        st.warning("⚠️ Build artifact not found. Attempting to build on server...")
        
        # Check if npm is available
        if shutil.which("npm") is None:
            st.error("❌ 'npm' is not installed on this server. Please add 'nodejs' and 'npm' to packages.txt.")
            return

        status_container = st.empty()
        
        try:
            with status_container.container():
                st.info("📦 Installing dependencies... (this may take a minute)")
                # Run npm install
                install_process = subprocess.run(
                    ["npm", "install"], 
                    cwd=app_dir, 
                    check=True, 
                    shell=False,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                st.info("🔨 Building React application...")
                # Run npm run build
                build_process = subprocess.run(
                    ["npm", "run", "build"], 
                    cwd=app_dir, 
                    check=True, 
                    shell=False,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
            
            status_container.success("✅ Build successful! Reloading...")
            st.rerun()
            
        except subprocess.CalledProcessError as e:
            status_container.error(f"❌ Build failed with error code {e.returncode}")
            with st.expander("View Build Logs (Error Details)", expanded=True):
                st.code(f"STDOUT:\n{e.stdout}\n\nSTDERR:\n{e.stderr}")
            return
        except Exception as e:
            status_container.error(f"❌ An unexpected error occurred: {str(e)}")
            return

    # Read the built HTML
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            html_content = f.read()
    except Exception as e:
        st.error(f"Failed to read build file: {e}")
        return

    # Get API Key from Streamlit Secrets or Environment
    api_key = st.secrets.get("API_KEY", os.environ.get("API_KEY", ""))

    if not api_key:
        st.warning("⚠️ API_KEY not found in secrets. AI features may not work.")

    # Inject the API Key into the window.process object so the React code can access process.env.API_KEY
    injection = f"""
    <script>
      window.process = {{
        env: {{
          API_KEY: "{api_key}"
        }}
      }};
    </script>
    """
    
    # Prepend the injection to the head
    html_content = injection + html_content

    # Render the app
    components.html(html_content, height=1000, scrolling=True)

if __name__ == "__main__":
    load_react_app()
