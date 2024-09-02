import React, { useContext, useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/react";
import { ChevronDown } from "@/util/icons/ChevronDown";
import English from "../../util/icons/english.webp";
import { useRouter } from "next/navigation";
import logo from "./favicon-512x512.png";
import save from "./floppy-disk-solid.svg";
import load from "./folder-open-solid.svg";
import {
  defaultState,
  GlobalStateContext,
} from "@/util/GlobalStateContextProvider";
import * as math from "mathjs";
import { GlobalState, SaveDataSchema } from "@/util/GlobalState";
import { downloadBlob } from "@/util/Util";
import ExportedImage from "next-image-export-optimizer";
import { LockIcon } from "@/util/icons/LockIcon";
import { cyrb53 } from "@/util/Math";
import { FailureMsg } from "@/util/UserMsgSystem";

export default function Index() {
  const router = useRouter();
  const [fileIsHovered, setFileIsHovered] = useState(false);
  const [settingsIsHovered, setSettingsIsHovered] = useState(false);
  const { globalState, setGlobalState } = useContext(GlobalStateContext);
  const [modalOpen, setModalOpen] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwInvalid, setPwInvalid] = useState(false);

  return (
    <>
      <Navbar
        position="sticky"
        isBordered
        maxWidth="full"
        onMouseLeave={() => {
          setFileIsHovered(false);
          setSettingsIsHovered(false);
        }}
      >
        <NavbarBrand
          style={{ height: "100%", flexGrow: "0", aspectRatio: "1" }}
        >
          <ExportedImage
            src={logo}
            alt=""
            style={{ objectFit: "contain", height: "80%", width: "auto" }}
          />
        </NavbarBrand>
        <NavbarContent className="sm:flex gap-4" justify="start">
          <input
            type="file"
            style={{ display: "none" }}
            id="file-picker"
            accept=".doe+"
            onChange={(e) => {
              const file = e.target.files![0];
              if (file) {
                const reader = new FileReader();
                reader.readAsText(file, "UTF-8");
                reader.onload = function (evt) {
                  try {
                    const parsedGlobalState = SaveDataSchema.parse(
                      JSON.parse(
                        atob(evt.target!.result as string),
                        math.reviver
                      )
                    );
                    //Recompile the equations because functions are not serialized
                    const data: GlobalState = {
                      ...defaultState,
                      ...parsedGlobalState,
                      transformEquation: math
                        .parse(parsedGlobalState.rawFactorInput)
                        .compile(),
                      retransformEquation: math
                        .parse(parsedGlobalState.rawRetransfromInput)
                        .compile(),
                    };
                    setGlobalState(data);
                  } catch (error) {
                    new FailureMsg(
                      `Your safe file is not a doe+ project or might have been corrupted. Was it created by an old version of doe+ simulator? Info: ${error}`
                    );
                  }
                };

                reader.onerror = function () {
                  new FailureMsg(
                    "There was a filesystem error loading the file. Please try again"
                  );
                };
              }
            }}
          />
          <Dropdown
            isOpen={fileIsHovered}
            onMouseLeave={() => setFileIsHovered(false)}
          >
            <NavbarItem>
              <DropdownTrigger>
                <Button
                  disableRipple
                  className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                  radius="sm"
                  variant="light"
                  style={{
                    fontSize: "var(--nextui-font-size-medium)",
                    lineHeight: "var(--nextui-line-height-medium)",
                  }}
                  endContent={<ChevronDown fill="currentColor" size={16} />}
                  onMouseEnter={() => setFileIsHovered(true)}
                >
                  File
                </Button>
              </DropdownTrigger>
            </NavbarItem>
            <DropdownMenu
              itemClasses={{
                base: "gap-4",
              }}
              onAction={(key) => {
                switch (key) {
                  case "save": {
                    const parsed = SaveDataSchema.safeParse(globalState);
                    if (parsed.success) {
                      const blob = new Blob(
                        [btoa(JSON.stringify(parsed.data, math.replacer))],
                        {
                          type: "application/octet-stream",
                        }
                      );

                      downloadBlob(blob, "project.doe+");
                    } else console.error("error");
                    break;
                  }

                  case "load":
                    document.getElementById("file-picker")!.click();
                    break;
                }
              }}
            >
              <DropdownItem
                key="save"
                startContent={
                  <ExportedImage src={save} alt="" width={30} height={30} />
                }
              >
                Save project
              </DropdownItem>
              <DropdownItem
                key="load"
                startContent={
                  <ExportedImage src={load} alt="" width={30} height={30} />
                }
              >
                Load project
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <NavbarItem>
            <Link href="/simulation">Simulation</Link>
          </NavbarItem>

          <Dropdown
            isOpen={settingsIsHovered && globalState.unlocked}
            onMouseLeave={() => setSettingsIsHovered(false)}
          >
            <NavbarItem>
              <DropdownTrigger>
                <Button
                  disableRipple
                  className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                  radius="sm"
                  variant="light"
                  style={{
                    fontSize: "var(--nextui-font-size-medium)",
                    lineHeight: "var(--nextui-line-height-medium)",
                  }}
                  endContent={
                    globalState.unlocked ? (
                      <ChevronDown fill="currentColor" size={16} />
                    ) : (
                      <LockIcon fill="currentColor" />
                    )
                  }
                  onMouseEnter={() => setSettingsIsHovered(true)}
                  onClick={() => {
                    if (!globalState.unlocked) setModalOpen(true);
                  }}
                >
                  Settings
                </Button>
              </DropdownTrigger>
            </NavbarItem>
            <DropdownMenu
              itemClasses={{
                base: "gap-4",
              }}
              onAction={(key) => router.push(`/settings/${key}`)}
            >
              <DropdownItem key="factors">Factors</DropdownItem>
              <DropdownItem key="targets">Targets</DropdownItem>
              <DropdownItem key="retransformedtargets">
                Retransformed targets
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <NavbarItem>
            <Link href="/measurements">Measurements</Link>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent as="div" className="items-center" justify="end">
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                isBordered
                as="button"
                color="secondary"
                size="sm"
                src={English.src}
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
              <DropdownItem
                key="english"
                startContent={
                  <ExportedImage src={English} alt="" width={30} height={30} />
                }
              >
                English
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>
      </Navbar>
      <Modal size="xs" isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Unlock settings
              </ModalHeader>
              <ModalBody>
                <Input
                  type="password"
                  isClearable
                  placeholder="Enter password"
                  label="Password"
                  onChange={(v) => setPwInput(v.target.value)}
                  isInvalid={pwInvalid}
                  errorMessage="The password is wrong"
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  onPress={() => {
                    if (cyrb53(pwInput) === 132094155397256) {
                      setGlobalState((previousState) => ({
                        ...previousState,
                        unlocked: true,
                      }));
                      setPwInvalid(false);
                      onClose();
                    } else setPwInvalid(true);
                  }}
                >
                  Verify password
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
