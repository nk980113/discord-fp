import {
    ApplicationCommandConfig,
    DescriptionConfig,
    Group,
    Node,
} from "@/types.js";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { debugNode } from "@/utils/log.js";
import { GroupLoader, LoadContext } from "@/core/loader.js";
import { createSlashBuilder, createBaseBuilder } from "@/utils/builder.js";
import { SlashCommandLoader } from "./slash.js";

export type SlashGroupConfig = ApplicationCommandConfig & DescriptionConfig;

/**
 * Register a command group
 */
export function group(config: SlashGroupConfig): SlashCommandGroupLoader {
    return new SlashCommandGroupLoader(config);
}

export class SlashCommandGroupLoader implements GroupLoader {
    readonly type = "group";
    readonly config: SlashGroupConfig;

    constructor(config: SlashGroupConfig) {
        this.config = config;
    }

    async load(self: Group, context: LoadContext) {
        const config = this.config;
        const command = createSlashBuilder(self.name, config);

        for (const node of self.nodes) {
            if (
                node.type === "file" &&
                node.loader instanceof SlashCommandLoader
            ) {
                const loader = node.loader;
                const subcommand = loader.loadSubCommand(node, context, [
                    command.name,
                    null,
                ]);

                command.addSubcommand(subcommand);
                debugNode(node, "Subcommand Loaded");
                continue;
            }

            if (
                node.type === "group" &&
                node.meta.loader instanceof SlashCommandGroupLoader
            ) {
                const loader = node.meta.loader;
                const group = loader.loadSubCommandGroup(
                    node,
                    context,
                    command.name
                );

                command.addSubcommandGroup(group);
                debugNode(node, "Subcommand Group Loaded");
                continue;
            }

            errorInvalidFile(node);
        }

        context.commands.push(command);
    }

    loadSubCommandGroup(
        { name, nodes }: Group,
        context: LoadContext,
        parent: string
    ) {
        const config = this.config;

        const group = createBaseBuilder(
            new SlashCommandSubcommandGroupBuilder(),
            name,
            config
        );

        for (const node of nodes) {
            if (
                node.type === "file" &&
                node.loader instanceof SlashCommandLoader
            ) {
                const loader = node.loader;
                const subcommand = loader.loadSubCommand(node, context, [
                    parent,
                    group.name,
                ]);

                group.addSubcommand(subcommand);
                debugNode(node, `Subcommand in ${name} had been Loaded`);
                continue;
            }

            errorInvalidFile(node);
        }

        return group;
    }
}

function errorInvalidFile(node: Node) {
    throw new Error(`Invalid file ${node.path} (${node.type})`);
}
