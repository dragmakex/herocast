import React, { useEffect, useState } from "react";

import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { CardHeader, Card } from "@/components/ui/card";
import { SelectableListWithHotkeys } from "@/common/components/SelectableListWithHotkeys";
import { CastRow } from "@/common/components/CastRow";
import { CastWithInteractions } from "@neynar/nodejs-sdk/build/neynar-api/v2/openapi-farcaster/models/cast-with-interactions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FollowButton from "@/common/components/FollowButton";
import { useAccountStore } from "@/stores/useAccountStore";
import { useDataStore } from "@/stores/useDataStore";
import type { InferGetServerSidePropsType, GetServerSideProps } from "next";
import { User } from "@neynar/nodejs-sdk/build/neynar-api/v2";

const APP_FID = Number(process.env.NEXT_PUBLIC_APP_FID!);

export const getServerSideProps = (async ({ params: { slug } }) => {
  const client = new NeynarAPIClient(process.env.NEXT_PUBLIC_NEYNAR_API_KEY!);
  let user: any = {};
  try {
    if (slug.startsWith("fid:")) {
      const fid = slug.split(":")[1];
      user = (await client.fetchBulkUsers([fid], { viewerFid: APP_FID }))
        .users?.[0];
    } else {
      user = await client.lookupUserByUsername(slug);
    }
  } catch (error) {
    console.error("Failed to get data for profile page", error, slug);
    return {
      props: {
        profile: undefined,
        error: `Failed to get data for profile page: ${JSON.stringify(error)}`,
      },
    };
  }

  return {
    props: {
      profile: user.result.user,
    },
  };
}) satisfies GetServerSideProps<{ profile?: User; error?: string }>;

enum FeedTypeEnum {
  "casts" = "Casts",
  "likes" = "Likes",
}
export default function Profile({
  profile,
  error,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [selectedFeedIdx, setSelectedFeedIdx] = useState(0);
  const [casts, setCasts] = useState<CastWithInteractions[]>([]);
  const [feedType, setFeedType] = useState<FeedTypeEnum>(FeedTypeEnum.casts);

  const { addUserProfile } = useDataStore();
  const { accounts, selectedAccountIdx } = useAccountStore();

  const selectedAccount = accounts[selectedAccountIdx];
  const userFid = Number(selectedAccount?.platformAccountId) || APP_FID;

  const onSelectCast = (idx: number) => {
    setSelectedFeedIdx(idx);
  };

  useEffect(() => {
    if (!profile) return;

    const getData = async () => {
      try {
        if (!userFid) {
          throw new Error("userFid is not set");
        }
        const neynarClient = new NeynarAPIClient(
          process.env.NEXT_PUBLIC_NEYNAR_API_KEY!
        );
        const resp = await neynarClient.fetchBulkUsers([profile.fid], {
          viewerFid: userFid! as number,
        });
        if (resp?.users && resp.users.length === 1) {
          addUserProfile({ user: resp.users[0] });
        }
      } catch (error) {
        console.error("Failed to fetch user profile", error);
      }
    };

    getData();
  }, [profile, userFid]);

  useEffect(() => {
    if (!profile) return;

    const loadFeed = async () => {
      const client = new NeynarAPIClient(
        process.env.NEXT_PUBLIC_NEYNAR_API_KEY!
      );

      if (feedType === FeedTypeEnum.casts) {
        client
          .fetchFeed("filter", {
            filterType: "fids",
            fids: [profile.fid],
            withRecasts: true,
            limit: 25,
          })
          .then(({ casts }) => {
            setCasts(casts);
          })
          .catch((err) => console.log(`failed to fetch ${err}`));
      } else if (feedType === FeedTypeEnum.likes) {
        client
          .fetchUserReactions(profile.fid, "likes", {
            limit: 25,
          })
          .then(({ reactions }) => {
            setCasts(reactions.map(({ cast }) => cast));
          });
      }
    };

    loadFeed();
  }, [profile, feedType]);

  const renderEmptyState = () => (
    <div className="max-w-7xl px-6 pb-24 sm:pb-32 lg:flex lg:px-8">
      <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl">
        <div className="mt-2">
          <h2>Loading...</h2>
        </div>
      </div>
    </div>
  );

  const renderRow = (item: CastWithInteractions, idx: number) => (
    <li
      key={item?.hash}
      className="border-b border-gray-700/40 relative flex items-center space-x-4 max-w-full md:max-w-2xl"
    >
      <CastRow
        cast={item}
        showChannel
        isSelected={selectedFeedIdx === idx}
        onSelect={() => onSelectCast(idx)}
      />
    </li>
  );

  const renderFeed = () => (
    <>
      <Tabs value={feedType} className="p-5 w-full max-w-full">
        <TabsList className="grid w-full grid-cols-2">
          {Object.keys(FeedTypeEnum).map((key) => {
            return (
              <TabsTrigger
                key={key}
                value={FeedTypeEnum[key]}
                className="text-foreground/80 text-center"
                onClick={() => setFeedType(FeedTypeEnum[key])}
              >
                {FeedTypeEnum[key]}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <SelectableListWithHotkeys
        data={casts}
        selectedIdx={selectedFeedIdx}
        setSelectedIdx={setSelectedFeedIdx}
        renderRow={(item: any, idx: number) => renderRow(item, idx)}
        onExpand={() => null}
        onSelect={() => null}
        isActive
      />
    </>
  );

  const renderProfile = () => (
    <div>
      <Card className="max-w-2xl mx-auto bg-transparent border-none shadow-none">
        <CardHeader className="flex space-y-0">
          <div className="grid space-x-4 grid-cols-2 lg:grid-cols-3">
            <div className="col-span-1 lg:col-span-2">
              <Avatar className="h-14 w-14">
                <AvatarImage alt="User avatar" src={profile.pfp.url} />
                <AvatarFallback>{profile.username}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <h2 className="text-xl font-bold text-foreground">
                  {profile.displayName}
                </h2>
                <span className="text-sm text-foreground/80">
                  @{profile.username}
                </span>
              </div>
            </div>
            {userFid !== profile.fid && (
              <FollowButton username={profile.username} />
            )}
          </div>
          <div className="flex pt-4 text-sm text-foreground/80">
            <span className="mr-4">
              <strong>{profile.followingCount}</strong> Following
            </span>
            <span>
              <strong>{profile.followerCount}</strong> Followers
            </span>
          </div>
          <span className="text-foreground">{profile.profile.bio.text}</span>
        </CardHeader>
      </Card>
      {renderFeed()}
    </div>
  );

  if (error) {
    return (
      <div className="mt-6 max-w-3xl lg:flex lg:px-8">
        <h2>Error: {error}</h2>
      </div>
    );
  }

  return !profile ? renderEmptyState() : renderProfile();
}
