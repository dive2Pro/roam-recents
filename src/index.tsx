import React from "react";
import ReactDOM from "react-dom";
import { Button, ButtonGroup } from "@blueprintjs/core";

declare global {
  interface Window {
    roamAlphaAPI: any;
  }
}

const getCurrentPageInfo = async () => {
  let current_uid =
    await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
  if (!current_uid) {
    throw new Error("not in page");
  }
  let pageInfo = window.roamAlphaAPI.q(`
        [
        :find  (pull ?c [ :block/uid :node/title ]) .
        :where
        [?b :block/uid "${current_uid}"]
        [?b :block/page ?c]
       
        ]
        `);
  if (pageInfo) {
    return pageInfo;
  }
  return window.roamAlphaAPI.q(`
        [
        :find  (pull ?c [ :block/uid :node/title ]) .
        :where
        [?c :block/uid "${current_uid}"]
       
       
        ]
        `);
};
const CACHE_KEY = "__roam_recents";

type Recent = {
  uid: string;
  title: string;
};
class Cache {
  sync(json: Recent[]) {
    // localStorage.setItem(CACHE_KEY, json);
    console.log({ extensionAPI })
    extensionAPI.settings.set(CACHE_KEY, json);
  }
  read() {
    try {
      return (extensionAPI.settings.get(CACHE_KEY) || []) as Recent[];
    } catch (e) {
      return [];
    }
  }
}

const cache = new Cache();

function History(props: { hide?: boolean }) {
  const [recents, setRecents] = React.useState(() => cache.read());

  React.useEffect(() => {
    async function onHashChange() {
      const pageInfo = await getCurrentPageInfo();
      const found_index = recents.findIndex((item) => {
        return item.uid === pageInfo.uid;
      });
      if (found_index === -1) {
      } else {
        recents.splice(found_index, 1);
      }
      recents.unshift(pageInfo);
      cache.sync(recents);
      setRecents([...recents]);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  if (props.hide) {
    return null;
  }
  return (
    <section
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "#182026",
      }}
    >
      {recents.map((recent) => {
        return (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (e.shiftKey) {
                window.roamAlphaAPI.ui.rightSidebar.addWindow({
                  window: { type: "block", "block-uid": recent.uid },
                });
                return false;
              }
              window.roamAlphaAPI.ui.mainWindow.openPage({
                page: { uid: recent.uid },
              });
              return false;
            }}
          >
            <div className="page">{recent.title}</div>
          </a>
        );
      })}
    </section>
  );
}

function NavMenu() {
  const [active, setActive] = React.useState("star");
  const isActive = (_active: string) => {
    return active === _active;
  };
  console.log(" nav render ");
  return (
    <ButtonGroup fill className="bp3-dark">
      <Button
        intent={isActive("star") ? "primary" : "none"}
        onClick={() => {
          setActive("star");
          ReactDOM.render(<History hide={true} />, div);
        }}
        icon="star"
        active={isActive("star")}
      >
        <small>Shorcuts</small>
      </Button>

      <Button
        intent={isActive("time") ? "primary" : "none"}
        onClick={() => {
          setActive("time");
          ReactDOM.render(<History />, div);
        }}
        icon="time"
        active={isActive("time")}
      >
        <small>Recents</small>
      </Button>
    </ButtonGroup>
  );
}

let unload = () => {
  //
};
const div = document.createElement("div");
let extensionAPI: RoamExtensionAPI;
export default {
  onload(_extensionAPI: { extensionAPI: RoamExtensionAPI }) {
    extensionAPI = _extensionAPI.extensionAPI;
    console.log({ extensionAPI });
    const el_starred_pages = document.querySelector(".starred-pages");
    const el = el_starred_pages.previousElementSibling;
    el_starred_pages.appendChild(div);
    console.log(" loaded ");
    ReactDOM.render(<NavMenu />, el);
    unload = () => {
      div.remove();
    };
  },
  onunload() {
    unload();
  },
};
